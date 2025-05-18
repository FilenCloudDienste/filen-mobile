import type { MaterialIconName, SfSymbolIconName } from '@roninoss/icons';
import type { View, ViewProps } from 'react-native';

type MaterialIcon = {
  name: MaterialIconName;
  namingScheme?: 'material' | undefined;
  color?: string;
};

type SfSymbolIcon = {
  name: SfSymbolIconName;
  namingScheme: 'sfSymbol';
  color?: string;
};

type ContextMenuIcon = SfSymbolIcon | MaterialIcon;

type ContextItem = {
  actionKey: string;
  title?: string;
  subTitle?: string;
  state?: { checked: boolean };
  keepOpenOnPress?: boolean;
  // iOS 14 and above
  loading?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  // icon or image, not both image has higher priority
  icon?: ContextMenuIcon;
  // icon or image, not both image has higher priority
  image?: { url?: string; cornerRadius?: number; tint?: string };
};

type ContextMenuSubMenuDropdown = {
  iOSType?: 'dropdown';
  // preferred item size
  iOSItemSize?: 'large';
  destructive?: boolean;
};

type ContextMenuSubMenuInline = {
  iOSType: 'inline';
  // preferred item size
  iOSItemSize?: 'small' | 'medium';
};

type ContextSubMenu = (ContextMenuSubMenuDropdown | ContextMenuSubMenuInline) & {
  title: string;
  // Displayed on iOS 15 and above only, used as accessibility hint otherwise
  subTitle?: string;
  // iOS 14 and above only
  loading?: boolean;
  // No items shows nothing
  items: (ContextItem | ContextSubMenu)[];
};

type ContextMenuConfig = {
  title?: string;
  items: (ContextItem | ContextSubMenu)[];
  // preferred item size
  iOSItemSize?: 'small' | 'medium' | 'large';
};

type ContextMenuProps = ContextMenuConfig &
  ViewProps & {
    children: React.ReactNode;
    onItemPress?: (item: Omit<ContextItem, 'icon'>, isUsingActionSheetFallback?: boolean) => void;
    enabled?: boolean;
    iosRenderPreview?: () => React.ReactElement;
    iosOnPressMenuPreview?: () => void;
    renderAuxiliaryPreview?: () => React.ReactElement;
    auxiliaryPreviewPosition?: 'start' | 'center' | 'end';
    materialPortalHost?: string;
    // defaults to 2
    materialSideOffset?: number;
    materialAlignOffset?: number;
    materialAlign?: 'start' | 'center' | 'end';
    materialWidth?: number;
    materialMinWidth?: number;
    materialLoadingText?: string;
    materialSubMenuTitlePlaceholder?: string;
    materialOverlayClassName?: string;
  };

type ContextMenuRef = React.ElementRef<typeof View> & {
  presentMenu?: () => void;
  dismissMenu?: () => void;
};

export type { ContextMenuProps, ContextMenuConfig, ContextSubMenu, ContextItem, ContextMenuRef };
