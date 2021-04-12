import { Animation, AnimationCallbackOptions, AnimationDirection, AnimationFill, AnimationKeyFrames, AnimationLifecycle } from '@ionic/core';
import React from 'react';
interface PartialPropertyValue {
    property: string;
    value: any;
}
interface PropertyValue {
    property: string;
    fromValue: any;
    toValue: any;
}
export interface CreateAnimationProps {
    delay?: number;
    direction?: AnimationDirection;
    duration?: number;
    easing?: string;
    fill?: AnimationFill;
    iterations?: number;
    id?: string;
    afterAddRead?: () => void;
    afterAddWrite?: () => void;
    afterClearStyles?: string[];
    afterStyles?: {
        [property: string]: any;
    };
    afterAddClass?: string | string[];
    afterRemoveClass?: string | string[];
    beforeAddRead?: () => void;
    beforeAddWrite?: () => void;
    beforeClearStyles?: string[];
    beforeStyles?: {
        [property: string]: any;
    };
    beforeAddClass?: string | string[];
    beforeRemoveClass?: string | string[];
    onFinish?: {
        callback: AnimationLifecycle;
        opts?: AnimationCallbackOptions;
    };
    keyframes?: AnimationKeyFrames;
    from?: PartialPropertyValue[] | PartialPropertyValue;
    to?: PartialPropertyValue[] | PartialPropertyValue;
    fromTo?: PropertyValue[] | PropertyValue;
    play?: boolean;
    pause?: boolean;
    stop?: boolean;
    destroy?: boolean;
    progressStart?: {
        forceLinearEasing: boolean;
        step?: number;
    };
    progressStep?: {
        step: number;
    };
    progressEnd?: {
        playTo: 0 | 1 | undefined;
        step: number;
        dur?: number;
    };
}
export declare class CreateAnimation extends React.PureComponent<CreateAnimationProps> {
    nodes: Map<number, HTMLElement>;
    animation: Animation;
    constructor(props: any);
    setupAnimation(props: any): void;
    componentDidMount(): void;
    componentDidUpdate(prevProps: any): void;
    render(): JSX.Element;
}
export {};
