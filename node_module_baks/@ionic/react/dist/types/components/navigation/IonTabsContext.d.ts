import React from 'react';
export interface IonTabsContextState {
    activeTab: string | undefined;
    selectTab: (tab: string) => boolean;
}
export declare const IonTabsContext: React.Context<IonTabsContextState>;
