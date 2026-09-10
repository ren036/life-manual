type ApplyUpdate = () => void;
type UpdateListener = (applyUpdate: ApplyUpdate) => void;

const updateListeners = new Set<UpdateListener>();
let waitingWorker: ServiceWorker | null = null;
let updateRequested = false;
const watchedWorkers = new WeakSet<ServiceWorker>();

function applyWaitingUpdate() {
  if (!waitingWorker) return;
  updateRequested = true;
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

function announceUpdate(worker: ServiceWorker) {
  waitingWorker = worker;
  updateListeners.forEach((listener) => listener(applyWaitingUpdate));
}

function watchInstallingWorker(worker: ServiceWorker) {
  if (watchedWorkers.has(worker)) return;
  watchedWorkers.add(worker);
  const checkState = () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      announceUpdate(worker);
    }
  };
  worker.addEventListener('statechange', checkState);
  checkState();
}

async function latestDeploymentVersion() {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return __DEPLOYED_AT__;
    const value = (await response.json()) as { deployedAt?: unknown };
    return typeof value.deployedAt === 'string' ? value.deployedAt : __DEPLOYED_AT__;
  } catch {
    return __DEPLOYED_AT__;
  }
}

async function checkForUpdate() {
  const deployedAt = await latestDeploymentVersion();
  const registration = await navigator.serviceWorker.register(
    `/service-worker.js?v=${encodeURIComponent(deployedAt)}`,
    { updateViaCache: 'none' },
  );

  if (registration.waiting && navigator.serviceWorker.controller) {
    announceUpdate(registration.waiting);
  }
  if (registration.installing) watchInstallingWorker(registration.installing);
  registration.addEventListener('updatefound', () => {
    if (registration.installing) watchInstallingWorker(registration.installing);
  });
}

export function onAppUpdateAvailable(listener: UpdateListener) {
  updateListeners.add(listener);
  if (waitingWorker) listener(applyWaitingUpdate);
  return () => {
    updateListeners.delete(listener);
  };
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested) return;
    updateRequested = false;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    void checkForUpdate().catch(() => undefined);
  });
}
