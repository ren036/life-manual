import { notifications } from '@mantine/notifications';

export function toast(message: string) {
  notifications.show({ message, color: 'green', radius: 'lg', withBorder: true });
}

export function errorToast(message: string) {
  notifications.show({ message, color: 'red', radius: 'lg', withBorder: true });
}
