declare type PermissionDesc = PermissionDescriptor | DevicePermissionDescriptor | MidiPermissionDescriptor | PushPermissionDescriptor;
declare type State = PermissionState | '';
declare const usePermission: (permissionDesc: PermissionDesc) => State;
export default usePermission;
