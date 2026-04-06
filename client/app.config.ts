import { ExpoConfig, ConfigContext } from 'expo/config';

const appName = '联智记帐';
const projectId = process.env.COZE_PROJECT_ID || process.env.EXPO_PUBLIC_COZE_PROJECT_ID;
const slugAppName = projectId ? `app${projectId}` : 'myapp';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    "name": appName,
    "slug": slugAppName,
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": false,
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#4F46E5"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": `com.anonymous.x${projectId || '0'}`
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      'expo-router',
      [
        "expo-image-picker",
        {
          "photosPermission": `允许联智记帐访问您的相册，以便您上传或保存图片。`,
          "cameraPermission": `允许联智记帐使用您的相机，以便您直接拍摄照片上传。`,
          "microphonePermission": `允许联智记帐访问您的麦克风，以便您拍摄带有声音的视频。`
        }
      ],
      "@react-native-community/datetimepicker",
      "expo-splash-screen"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
