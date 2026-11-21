import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { auth } from './firebase';

// Adresse de la fonction qui envoie les notifications (Google Cloud Run)
const NOTIFY_URL = 'https://notify-155009954826.europe-west1.run.app';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Renvoie le jeton Firebase (FCM) de ce téléphone, ou null
export async function getPushToken() {
  try {
    if (!Device.isDevice) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('courses', {
        name: 'Courses',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 300, 200, 300],
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return null;
    const t = await Notifications.getDevicePushTokenAsync();
    return t.data;
  } catch (e) {
    console.warn('push', e.message);
    return null;
  }
}

// Demande au serveur d'envoyer une notification.
// data.driver = true → au chauffeur ; sinon → au client de la course.
export async function sendPush(_to, title, body, data = {}) {
  try {
    if (!data.rideId || !auth.currentUser) return;
    const idToken = await auth.currentUser.getIdToken();
    await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
      body: JSON.stringify({ rideId: data.rideId, toDriver: !!data.driver, title, body }),
    });
  } catch (e) {
    console.warn('sendPush', e.message);
  }
}
