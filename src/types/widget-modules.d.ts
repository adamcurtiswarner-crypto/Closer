declare module 'react-native-shared-group-preferences' {
  const SharedGroupPreferences: {
    setItem(key: string, value: any, appGroup: string): Promise<void>;
    getItem(key: string, appGroup: string): Promise<any>;
  };
  export default SharedGroupPreferences;
}

declare module 'react-native-widget-extension' {
  export function reloadAllTimelines(): void;
  export function reloadTimelines(ofKind: string): void;
}
