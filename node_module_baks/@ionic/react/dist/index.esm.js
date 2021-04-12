import React, { useContext, useRef, useEffect, Fragment } from 'react';
import { defineCustomElements } from '@ionic/core/loader';
import { addIcons } from 'ionicons';
import { arrowBackSharp, caretBackSharp, chevronBack, chevronForward, close, closeCircle, closeSharp, menuOutline, menuSharp, reorderTwoSharp, reorderThreeOutline, searchOutline, searchSharp } from 'ionicons/icons';
import { isPlatform as isPlatform$1, getPlatforms as getPlatforms$1, alertController, loadingController, toastController as toastController$1, pickerController, actionSheetController as actionSheetController$1, modalController, popoverController, createAnimation } from '@ionic/core';
export { IonicSafeString, createAnimation, createGesture, iosTransitionAnimation, mdTransitionAnimation, setupConfig } from '@ionic/core';
import { __rest } from 'tslib';
import ReactDOM from 'react-dom';

const IonLifeCycleContext = /*@__PURE__*/ React.createContext({
    onIonViewWillEnter: () => {
        return;
    },
    ionViewWillEnter: () => {
        return;
    },
    onIonViewDidEnter: () => {
        return;
    },
    ionViewDidEnter: () => {
        return;
    },
    onIonViewWillLeave: () => {
        return;
    },
    ionViewWillLeave: () => {
        return;
    },
    onIonViewDidLeave: () => {
        return;
    },
    ionViewDidLeave: () => {
        return;
    },
});
const DefaultIonLifeCycleContext = class {
    constructor() {
        this.ionViewWillEnterCallbacks = [];
        this.ionViewDidEnterCallbacks = [];
        this.ionViewWillLeaveCallbacks = [];
        this.ionViewDidLeaveCallbacks = [];
    }
    onIonViewWillEnter(callback) {
        if (callback.id) {
            const index = this.ionViewWillEnterCallbacks.findIndex((x) => x.id === callback.id);
            if (index > -1) {
                this.ionViewWillEnterCallbacks[index] = callback;
            }
            else {
                this.ionViewWillEnterCallbacks.push(callback);
            }
        }
        else {
            this.ionViewWillEnterCallbacks.push(callback);
        }
    }
    ionViewWillEnter() {
        this.ionViewWillEnterCallbacks.forEach((cb) => cb());
    }
    onIonViewDidEnter(callback) {
        if (callback.id) {
            const index = this.ionViewDidEnterCallbacks.findIndex((x) => x.id === callback.id);
            if (index > -1) {
                this.ionViewDidEnterCallbacks[index] = callback;
            }
            else {
                this.ionViewDidEnterCallbacks.push(callback);
            }
        }
        else {
            this.ionViewDidEnterCallbacks.push(callback);
        }
    }
    ionViewDidEnter() {
        this.ionViewDidEnterCallbacks.forEach((cb) => cb());
    }
    onIonViewWillLeave(callback) {
        if (callback.id) {
            const index = this.ionViewWillLeaveCallbacks.findIndex((x) => x.id === callback.id);
            if (index > -1) {
                this.ionViewWillLeaveCallbacks[index] = callback;
            }
            else {
                this.ionViewWillLeaveCallbacks.push(callback);
            }
        }
        else {
            this.ionViewWillLeaveCallbacks.push(callback);
        }
    }
    ionViewWillLeave() {
        this.ionViewWillLeaveCallbacks.forEach((cb) => cb());
    }
    onIonViewDidLeave(callback) {
        if (callback.id) {
            const index = this.ionViewDidLeaveCallbacks.findIndex((x) => x.id === callback.id);
            if (index > -1) {
                this.ionViewDidLeaveCallbacks[index] = callback;
            }
            else {
                this.ionViewDidLeaveCallbacks.push(callback);
            }
        }
        else {
            this.ionViewDidLeaveCallbacks.push(callback);
        }
    }
    ionViewDidLeave() {
        this.ionViewDidLeaveCallbacks.forEach((cb) => cb());
        this.componentCanBeDestroyed();
    }
    onComponentCanBeDestroyed(callback) {
        this.componentCanBeDestroyedCallback = callback;
    }
    componentCanBeDestroyed() {
        if (this.componentCanBeDestroyedCallback) {
            this.componentCanBeDestroyedCallback();
        }
    }
};

const withIonLifeCycle = (WrappedComponent) => {
    return class IonLifeCycle extends React.Component {
        constructor(props) {
            super(props);
            this.componentRef = React.createRef();
        }
        componentDidMount() {
            const element = this.componentRef.current;
            this.context.onIonViewWillEnter(() => {
                if (element && element.ionViewWillEnter) {
                    element.ionViewWillEnter();
                }
            });
            this.context.onIonViewDidEnter(() => {
                if (element && element.ionViewDidEnter) {
                    element.ionViewDidEnter();
                }
            });
            this.context.onIonViewWillLeave(() => {
                if (element && element.ionViewWillLeave) {
                    element.ionViewWillLeave();
                }
            });
            this.context.onIonViewDidLeave(() => {
                if (element && element.ionViewDidLeave) {
                    element.ionViewDidLeave();
                }
            });
        }
        render() {
            return (React.createElement(IonLifeCycleContext.Consumer, null, (context) => {
                this.context = context;
                return React.createElement(WrappedComponent, Object.assign({ ref: this.componentRef }, this.props));
            }));
        }
    };
};

const useIonViewWillEnter = (callback, deps = []) => {
    const context = useContext(IonLifeCycleContext);
    const id = useRef();
    id.current = id.current || Math.floor(Math.random() * 1000000);
    useEffect(() => {
        callback.id = id.current;
        context.onIonViewWillEnter(callback);
    }, deps);
};
const useIonViewDidEnter = (callback, deps = []) => {
    const context = useContext(IonLifeCycleContext);
    const id = useRef();
    id.current = id.current || Math.floor(Math.random() * 1000000);
    useEffect(() => {
        callback.id = id.current;
        context.onIonViewDidEnter(callback);
    }, deps);
};
const useIonViewWillLeave = (callback, deps = []) => {
    const context = useContext(IonLifeCycleContext);
    const id = useRef();
    id.current = id.current || Math.floor(Math.random() * 1000000);
    useEffect(() => {
        callback.id = id.current;
        context.onIonViewWillLeave(callback);
    }, deps);
};
const useIonViewDidLeave = (callback, deps = []) => {
    const context = useContext(IonLifeCycleContext);
    const id = useRef();
    id.current = id.current || Math.floor(Math.random() * 1000000);
    useEffect(() => {
        callback.id = id.current;
        context.onIonViewDidLeave(callback);
    }, deps);
};

const NavContext = /*@__PURE__*/ React.createContext({
    getIonRedirect: () => undefined,
    getIonRoute: () => undefined,
    getPageManager: () => undefined,
    getStackManager: () => undefined,
    goBack: (route) => {
        if (typeof window !== 'undefined') {
            if (typeof route === 'string') {
                window.location.pathname = route;
            }
            else {
                window.history.back();
            }
        }
    },
    navigate: (path) => {
        if (typeof window !== 'undefined') {
            window.location.pathname = path;
        }
    },
    hasIonicRouter: () => false,
    routeInfo: undefined,
    setCurrentTab: () => undefined,
    changeTab: (_tab, path) => {
        if (typeof window !== 'undefined') {
            window.location.pathname = path;
        }
    },
    resetTab: (_tab, path) => {
        if (typeof window !== 'undefined') {
            window.location.pathname = path;
        }
    },
});

const dashToPascalCase = (str) => str
    .toLowerCase()
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
const camelToDashCase = (str) => str.replace(/([A-Z])/g, (m) => `-${m[0].toLowerCase()}`);

const attachProps = (node, newProps, oldProps = {}) => {
    // some test frameworks don't render DOM elements, so we test here to make sure we are dealing with DOM first
    if (node instanceof Element) {
        // add any classes in className to the class list
        const className = getClassName(node.classList, newProps, oldProps);
        if (className !== '') {
            node.className = className;
        }
        Object.keys(newProps).forEach((name) => {
            if (name === 'children' ||
                name === 'style' ||
                name === 'ref' ||
                name === 'class' ||
                name === 'className' ||
                name === 'forwardedRef') {
                return;
            }
            if (name.indexOf('on') === 0 && name[2] === name[2].toUpperCase()) {
                const eventName = name.substring(2);
                const eventNameLc = eventName[0].toLowerCase() + eventName.substring(1);
                if (!isCoveredByReact(eventNameLc)) {
                    syncEvent(node, eventNameLc, newProps[name]);
                }
            }
            else {
                const propType = typeof newProps[name];
                if (propType === 'string') {
                    node.setAttribute(camelToDashCase(name), newProps[name]);
                }
                else {
                    node[name] = newProps[name];
                }
            }
        });
    }
};
const getClassName = (classList, newProps, oldProps) => {
    const newClassProp = newProps.className || newProps.class;
    const oldClassProp = oldProps.className || oldProps.class;
    // map the classes to Maps for performance
    const currentClasses = arrayToMap(classList);
    const incomingPropClasses = arrayToMap(newClassProp ? newClassProp.split(' ') : []);
    const oldPropClasses = arrayToMap(oldClassProp ? oldClassProp.split(' ') : []);
    const finalClassNames = [];
    // loop through each of the current classes on the component
    // to see if it should be a part of the classNames added
    currentClasses.forEach((currentClass) => {
        if (incomingPropClasses.has(currentClass)) {
            // add it as its already included in classnames coming in from newProps
            finalClassNames.push(currentClass);
            incomingPropClasses.delete(currentClass);
        }
        else if (!oldPropClasses.has(currentClass)) {
            // add it as it has NOT been removed by user
            finalClassNames.push(currentClass);
        }
    });
    incomingPropClasses.forEach((s) => finalClassNames.push(s));
    return finalClassNames.join(' ');
};
/**
 * Checks if an event is supported in the current execution environment.
 * @license Modernizr 3.0.0pre (Custom Build) | MIT
 */
const isCoveredByReact = (eventNameSuffix) => {
    if (typeof document === 'undefined') {
        return true;
    }
    else {
        const eventName = 'on' + eventNameSuffix;
        let isSupported = eventName in document;
        if (!isSupported) {
            const element = document.createElement('div');
            element.setAttribute(eventName, 'return;');
            isSupported = typeof element[eventName] === 'function';
        }
        return isSupported;
    }
};
const syncEvent = (node, eventName, newEventHandler) => {
    const eventStore = node.__events || (node.__events = {});
    const oldEventHandler = eventStore[eventName];
    // Remove old listener so they don't double up.
    if (oldEventHandler) {
        node.removeEventListener(eventName, oldEventHandler);
    }
    // Bind new listener.
    node.addEventListener(eventName, (eventStore[eventName] = function handler(e) {
        if (newEventHandler) {
            newEventHandler.call(this, e);
        }
    }));
};
const arrayToMap = (arr) => {
    const map = new Map();
    arr.forEach((s) => map.set(s, s));
    return map;
};

const createForwardRef = (ReactComponent, displayName) => {
    const forwardRef = (props, ref) => {
        return React.createElement(ReactComponent, Object.assign({}, props, { forwardedRef: ref }));
    };
    forwardRef.displayName = displayName;
    return React.forwardRef(forwardRef);
};
const isPlatform = (platform) => {
    return isPlatform$1(window, platform);
};
const getPlatforms = () => {
    return getPlatforms$1(window);
};
const getConfig = () => {
    if (typeof window !== 'undefined') {
        const Ionic = window.Ionic;
        if (Ionic && Ionic.config) {
            return Ionic.config;
        }
    }
    return null;
};

const createReactComponent = (tagName, routerLinkComponent = false) => {
    const displayName = dashToPascalCase(tagName);
    const ReactComponent = class extends React.Component {
        constructor(props) {
            super(props);
            this.handleClick = (e) => {
                const { routerLink, routerDirection, routerOptions, routerAnimation } = this.props;
                if (routerLink !== undefined) {
                    e.preventDefault();
                    this.context.navigate(routerLink, routerDirection, undefined, routerAnimation, routerOptions);
                }
            };
            // If we weren't given a ref to forward, we still need one
            // in order to attach props to the wrapped element.
            this.ref = React.createRef();
        }
        componentDidMount() {
            this.componentDidUpdate(this.props);
        }
        componentDidUpdate(prevProps) {
            var _a;
            // Try to use the forwarded ref to get the child node.
            // Otherwise, use the one we created.
            const node = (((_a = this.props.forwardedRef) === null || _a === void 0 ? void 0 : _a.current) || this.ref.current);
            attachProps(node, this.props, prevProps);
        }
        render() {
            const _a = this.props, { children, forwardedRef, style, className, ref } = _a, cProps = __rest(_a, ["children", "forwardedRef", "style", "className", "ref"]);
            const propsToPass = Object.keys(cProps).reduce((acc, name) => {
                if (name.indexOf('on') === 0 && name[2] === name[2].toUpperCase()) {
                    const eventName = name.substring(2).toLowerCase();
                    if (isCoveredByReact(eventName)) {
                        acc[name] = cProps[name];
                    }
                }
                else if (typeof cProps[name] === 'string') {
                    acc[camelToDashCase(name)] = cProps[name];
                }
                return acc;
            }, {});
            const newProps = Object.assign(Object.assign({}, propsToPass), { ref: forwardedRef || this.ref, style });
            if (routerLinkComponent) {
                if (this.props.routerLink && !this.props.href) {
                    newProps.href = this.props.routerLink;
                }
                if (newProps.onClick) {
                    const oldClick = newProps.onClick;
                    newProps.onClick = (e) => {
                        oldClick(e);
                        if (!e.defaultPrevented) {
                            this.handleClick(e);
                        }
                    };
                }
                else {
                    newProps.onClick = this.handleClick;
                }
            }
            return React.createElement(tagName, newProps, children);
        }
        static get displayName() {
            return displayName;
        }
        static get contextType() {
            return NavContext;
        }
    };
    return createForwardRef(ReactComponent, displayName);
};

// ionic/core
const IonApp = /*@__PURE__*/ createReactComponent('ion-app');
const IonTab = /*@__PURE__*/ createReactComponent('ion-tab');
const IonRouterLink = /*@__PURE__*/ createReactComponent('ion-router-link', true);
const IonAvatar = /*@__PURE__*/ createReactComponent('ion-avatar');
const IonBackdrop = /*@__PURE__*/ createReactComponent('ion-backdrop');
const IonBadge = /*@__PURE__*/ createReactComponent('ion-badge');
const IonButton = /*@__PURE__*/ createReactComponent('ion-button', true);
const IonButtons = /*@__PURE__*/ createReactComponent('ion-buttons');
const IonCard = /*@__PURE__*/ createReactComponent('ion-card', true);
const IonCardContent = /*@__PURE__*/ createReactComponent('ion-card-content');
const IonCardHeader = /*@__PURE__*/ createReactComponent('ion-card-header');
const IonCardSubtitle = /*@__PURE__*/ createReactComponent('ion-card-subtitle');
const IonCardTitle = /*@__PURE__*/ createReactComponent('ion-card-title');
const IonCheckbox = /*@__PURE__*/ createReactComponent('ion-checkbox');
const IonCol = /*@__PURE__*/ createReactComponent('ion-col');
const IonContent = /*@__PURE__*/ createReactComponent('ion-content');
const IonChip = /*@__PURE__*/ createReactComponent('ion-chip');
const IonDatetime = /*@__PURE__*/ createReactComponent('ion-datetime');
const IonFab = /*@__PURE__*/ createReactComponent('ion-fab');
const IonFabButton = /*@__PURE__*/ createReactComponent('ion-fab-button', true);
const IonFabList = /*@__PURE__*/ createReactComponent('ion-fab-list');
const IonFooter = /*@__PURE__*/ createReactComponent('ion-footer');
const IonGrid = /*@__PURE__*/ createReactComponent('ion-grid');
const IonHeader = /*@__PURE__*/ createReactComponent('ion-header');
const IonImg = /*@__PURE__*/ createReactComponent('ion-img');
const IonInfiniteScroll = /*@__PURE__*/ createReactComponent('ion-infinite-scroll');
const IonInfiniteScrollContent = /*@__PURE__*/ createReactComponent('ion-infinite-scroll-content');
const IonInput = /*@__PURE__*/ createReactComponent('ion-input');
const IonItem = /*@__PURE__*/ createReactComponent('ion-item', true);
const IonItemDivider = /*@__PURE__*/ createReactComponent('ion-item-divider');
const IonItemGroup = /*@__PURE__*/ createReactComponent('ion-item-group');
const IonItemOption = /*@__PURE__*/ createReactComponent('ion-item-option', true);
const IonItemOptions = /*@__PURE__*/ createReactComponent('ion-item-options');
const IonItemSliding = /*@__PURE__*/ createReactComponent('ion-item-sliding');
const IonLabel = /*@__PURE__*/ createReactComponent('ion-label');
const IonList = /*@__PURE__*/ createReactComponent('ion-list');
const IonListHeader = /*@__PURE__*/ createReactComponent('ion-list-header');
const IonMenu = /*@__PURE__*/ createReactComponent('ion-menu');
const IonMenuButton = /*@__PURE__*/ createReactComponent('ion-menu-button');
const IonMenuToggle = /*@__PURE__*/ createReactComponent('ion-menu-toggle');
const IonNote = /*@__PURE__*/ createReactComponent('ion-note');
const IonPickerColumn = /*@__PURE__*/ createReactComponent('ion-picker-column');
const IonNav = /*@__PURE__*/ createReactComponent('ion-nav');
const IonProgressBar = /*@__PURE__*/ createReactComponent('ion-progress-bar');
const IonRadio = /*@__PURE__*/ createReactComponent('ion-radio');
const IonRadioGroup = /*@__PURE__*/ createReactComponent('ion-radio-group');
const IonRange = /*@__PURE__*/ createReactComponent('ion-range');
const IonRefresher = /*@__PURE__*/ createReactComponent('ion-refresher');
const IonRefresherContent = /*@__PURE__*/ createReactComponent('ion-refresher-content');
const IonReorder = /*@__PURE__*/ createReactComponent('ion-reorder');
const IonReorderGroup = /*@__PURE__*/ createReactComponent('ion-reorder-group');
const IonRippleEffect = /*@__PURE__*/ createReactComponent('ion-ripple-effect');
const IonRow = /*@__PURE__*/ createReactComponent('ion-row');
const IonSearchbar = /*@__PURE__*/ createReactComponent('ion-searchbar');
const IonSegment = /*@__PURE__*/ createReactComponent('ion-segment');
const IonSegmentButton = /*@__PURE__*/ createReactComponent('ion-segment-button');
const IonSelect = /*@__PURE__*/ createReactComponent('ion-select');
const IonSelectOption = /*@__PURE__*/ createReactComponent('ion-select-option');
const IonSelectPopover = /*@__PURE__*/ createReactComponent('ion-select-popover');
const IonSkeletonText = /*@__PURE__*/ createReactComponent('ion-skeleton-text');
const IonSlide = /*@__PURE__*/ createReactComponent('ion-slide');
const IonSlides = /*@__PURE__*/ createReactComponent('ion-slides');
const IonSpinner = /*@__PURE__*/ createReactComponent('ion-spinner');
const IonSplitPane = /*@__PURE__*/ createReactComponent('ion-split-pane');
const IonText = /*@__PURE__*/ createReactComponent('ion-text');
const IonTextarea = /*@__PURE__*/ createReactComponent('ion-textarea');
const IonThumbnail = /*@__PURE__*/ createReactComponent('ion-thumbnail');
const IonTitle = /*@__PURE__*/ createReactComponent('ion-title');
const IonToggle = /*@__PURE__*/ createReactComponent('ion-toggle');
const IonToolbar = /*@__PURE__*/ createReactComponent('ion-toolbar');
const IonVirtualScroll = /*@__PURE__*/ createReactComponent('ion-virtual-scroll');

const createControllerComponent = (displayName, controller) => {
    const didDismissEventName = `on${displayName}DidDismiss`;
    const didPresentEventName = `on${displayName}DidPresent`;
    const willDismissEventName = `on${displayName}WillDismiss`;
    const willPresentEventName = `on${displayName}WillPresent`;
    class Overlay extends React.Component {
        constructor(props) {
            super(props);
            this.isUnmounted = false;
            this.handleDismiss = this.handleDismiss.bind(this);
        }
        static get displayName() {
            return displayName;
        }
        async componentDidMount() {
            const { isOpen } = this.props;
            if (isOpen) {
                this.present();
            }
        }
        componentWillUnmount() {
            this.isUnmounted = true;
            if (this.overlay) {
                this.overlay.dismiss();
            }
        }
        async componentDidUpdate(prevProps) {
            if (prevProps.isOpen !== this.props.isOpen && this.props.isOpen === true) {
                this.present(prevProps);
            }
            if (this.overlay && prevProps.isOpen !== this.props.isOpen && this.props.isOpen === false) {
                await this.overlay.dismiss();
            }
        }
        handleDismiss(event) {
            if (this.props.onDidDismiss) {
                this.props.onDidDismiss(event);
            }
            if (this.props.forwardedRef) {
                this.props.forwardedRef.current = undefined;
            }
        }
        async present(prevProps) {
            const _a = this.props, cProps = __rest(_a, ["isOpen", "onDidDismiss", "onDidPresent", "onWillDismiss", "onWillPresent"]);
            this.overlay = await controller.create(Object.assign({}, cProps));
            attachProps(this.overlay, {
                [didDismissEventName]: this.handleDismiss,
                [didPresentEventName]: (e) => this.props.onDidPresent && this.props.onDidPresent(e),
                [willDismissEventName]: (e) => this.props.onWillDismiss && this.props.onWillDismiss(e),
                [willPresentEventName]: (e) => this.props.onWillPresent && this.props.onWillPresent(e),
            }, prevProps);
            // Check isOpen again since the value could have changed during the async call to controller.create
            // It's also possible for the component to have become unmounted.
            if (this.props.isOpen === true && this.isUnmounted === false) {
                if (this.props.forwardedRef) {
                    this.props.forwardedRef.current = this.overlay;
                }
                await this.overlay.present();
            }
        }
        render() {
            return null;
        }
    }
    return React.forwardRef((props, ref) => {
        return React.createElement(Overlay, Object.assign({}, props, { forwardedRef: ref }));
    });
};

const IonAlert = /*@__PURE__*/ createControllerComponent('IonAlert', alertController);

const IonLoading = /*@__PURE__*/ createControllerComponent('IonLoading', loadingController);

const toastController = {
    create: (options) => toastController$1.create(options),
    dismiss: (data, role, id) => toastController$1.dismiss(data, role, id),
    getTop: () => toastController$1.getTop(),
};
const IonToast = /*@__PURE__*/ createControllerComponent('IonToast', toastController);

const IonPicker = /*@__PURE__*/ createControllerComponent('IonPicker', pickerController);

const createOverlayComponent = (displayName, controller) => {
    const didDismissEventName = `on${displayName}DidDismiss`;
    const didPresentEventName = `on${displayName}DidPresent`;
    const willDismissEventName = `on${displayName}WillDismiss`;
    const willPresentEventName = `on${displayName}WillPresent`;
    class Overlay extends React.Component {
        constructor(props) {
            super(props);
            if (typeof document !== 'undefined') {
                this.el = document.createElement('div');
            }
            this.handleDismiss = this.handleDismiss.bind(this);
        }
        static get displayName() {
            return displayName;
        }
        componentDidMount() {
            if (this.props.isOpen) {
                this.present();
            }
        }
        componentWillUnmount() {
            if (this.overlay) {
                this.overlay.dismiss();
            }
        }
        handleDismiss(event) {
            if (this.props.onDidDismiss) {
                this.props.onDidDismiss(event);
            }
            if (this.props.forwardedRef) {
                this.props.forwardedRef.current = undefined;
            }
        }
        async componentDidUpdate(prevProps) {
            if (this.overlay) {
                attachProps(this.overlay, this.props, prevProps);
            }
            if (prevProps.isOpen !== this.props.isOpen && this.props.isOpen === true) {
                this.present(prevProps);
            }
            if (this.overlay && prevProps.isOpen !== this.props.isOpen && this.props.isOpen === false) {
                await this.overlay.dismiss();
            }
        }
        async present(prevProps) {
            const _a = this.props, cProps = __rest(_a, ["children", "isOpen", "onDidDismiss", "onDidPresent", "onWillDismiss", "onWillPresent"]);
            const elementProps = Object.assign(Object.assign({}, cProps), { ref: this.props.forwardedRef, [didDismissEventName]: this.handleDismiss, [didPresentEventName]: (e) => this.props.onDidPresent && this.props.onDidPresent(e), [willDismissEventName]: (e) => this.props.onWillDismiss && this.props.onWillDismiss(e), [willPresentEventName]: (e) => this.props.onWillPresent && this.props.onWillPresent(e) });
            this.overlay = await controller.create(Object.assign(Object.assign({}, elementProps), { component: this.el, componentProps: {} }));
            if (this.props.forwardedRef) {
                this.props.forwardedRef.current = this.overlay;
            }
            attachProps(this.overlay, elementProps, prevProps);
            await this.overlay.present();
        }
        render() {
            return ReactDOM.createPortal(this.props.isOpen ? this.props.children : null, this.el);
        }
    }
    return React.forwardRef((props, ref) => {
        return React.createElement(Overlay, Object.assign({}, props, { forwardedRef: ref }));
    });
};

const actionSheetController = {
    create: (options) => actionSheetController$1.create(options),
    dismiss: (data, role, id) => actionSheetController$1.dismiss(data, role, id),
    getTop: () => actionSheetController$1.getTop(),
};
const IonActionSheet = /*@__PURE__*/ createOverlayComponent('IonActionSheet', actionSheetController);

const IonModal = /*@__PURE__*/ createOverlayComponent('IonModal', modalController);

const IonPopover = /*@__PURE__*/ createOverlayComponent('IonPopover', popoverController);

const StackContext = React.createContext({
    registerIonPage: () => undefined,
    isInOutlet: () => false,
});

class PageManager extends React.PureComponent {
    constructor(props) {
        super(props);
        this.ionPageElementRef = this.props.forwardedRef || React.createRef();
    }
    componentDidMount() {
        if (this.ionPageElementRef.current) {
            this.context.registerIonPage(this.ionPageElementRef.current, this.props.routeInfo);
            this.ionPageElementRef.current.addEventListener('ionViewWillEnter', this.ionViewWillEnterHandler.bind(this));
            this.ionPageElementRef.current.addEventListener('ionViewDidEnter', this.ionViewDidEnterHandler.bind(this));
            this.ionPageElementRef.current.addEventListener('ionViewWillLeave', this.ionViewWillLeaveHandler.bind(this));
            this.ionPageElementRef.current.addEventListener('ionViewDidLeave', this.ionViewDidLeaveHandler.bind(this));
        }
    }
    componentWillUnmount() {
        if (this.ionPageElementRef.current) {
            this.ionPageElementRef.current.removeEventListener('ionViewWillEnter', this.ionViewWillEnterHandler.bind(this));
            this.ionPageElementRef.current.removeEventListener('ionViewDidEnter', this.ionViewDidEnterHandler.bind(this));
            this.ionPageElementRef.current.removeEventListener('ionViewWillLeave', this.ionViewWillLeaveHandler.bind(this));
            this.ionPageElementRef.current.removeEventListener('ionViewDidLeave', this.ionViewDidLeaveHandler.bind(this));
        }
    }
    ionViewWillEnterHandler() {
        this.ionLifeCycleContext.ionViewWillEnter();
    }
    ionViewDidEnterHandler() {
        this.ionLifeCycleContext.ionViewDidEnter();
    }
    ionViewWillLeaveHandler() {
        this.ionLifeCycleContext.ionViewWillLeave();
    }
    ionViewDidLeaveHandler() {
        this.ionLifeCycleContext.ionViewDidLeave();
    }
    render() {
        const _a = this.props, { className, children, routeInfo, forwardedRef } = _a, props = __rest(_a, ["className", "children", "routeInfo", "forwardedRef"]);
        return (React.createElement(IonLifeCycleContext.Consumer, null, (context) => {
            this.ionLifeCycleContext = context;
            const hidePageClass = this.context.isInOutlet() ? 'ion-page-invisible' : '';
            return (React.createElement("div", Object.assign({ className: className ? `${className} ion-page ${hidePageClass}` : `ion-page ${hidePageClass}`, ref: this.ionPageElementRef }, props), children));
        }));
    }
    static get contextType() {
        return StackContext;
    }
}

class IonPageInternal extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        const _a = this.props, { className, children, forwardedRef } = _a, props = __rest(_a, ["className", "children", "forwardedRef"]);
        return this.context.hasIonicRouter() ? (React.createElement(PageManager, Object.assign({ className: className ? `${className}` : '', routeInfo: this.context.routeInfo, forwardedRef: forwardedRef }, props), children)) : (React.createElement("div", Object.assign({ className: className ? `ion-page ${className}` : 'ion-page', ref: forwardedRef }, props), children));
    }
    static get displayName() {
        return 'IonPage';
    }
    static get contextType() {
        return NavContext;
    }
}
const IonPage = createForwardRef(IonPageInternal, 'IonPage');

const IonTabsContext = React.createContext({
    activeTab: undefined,
    selectTab: () => false,
});

const IonTabButtonInner = /*@__PURE__*/ createReactComponent('ion-tab-button');
const IonTabBarInner = /*@__PURE__*/ createReactComponent('ion-tab-bar');
const IonBackButtonInner = /*@__PURE__*/ createReactComponent('ion-back-button');
const IonRouterOutletInner = /*@__PURE__*/ createReactComponent('ion-router-outlet');
// ionicons
const IonIconInner = /*@__PURE__*/ createReactComponent('ion-icon');

class OutletPageManager extends React.Component {
    constructor(props) {
        super(props);
    }
    componentDidMount() {
        if (this.ionRouterOutlet) {
            setTimeout(() => {
                this.context.registerIonPage(this.ionRouterOutlet, this.props.routeInfo);
            }, 25);
            this.ionRouterOutlet.addEventListener('ionViewWillEnter', this.ionViewWillEnterHandler.bind(this));
            this.ionRouterOutlet.addEventListener('ionViewDidEnter', this.ionViewDidEnterHandler.bind(this));
            this.ionRouterOutlet.addEventListener('ionViewWillLeave', this.ionViewWillLeaveHandler.bind(this));
            this.ionRouterOutlet.addEventListener('ionViewDidLeave', this.ionViewDidLeaveHandler.bind(this));
        }
    }
    componentWillUnmount() {
        if (this.ionRouterOutlet) {
            this.ionRouterOutlet.removeEventListener('ionViewWillEnter', this.ionViewWillEnterHandler.bind(this));
            this.ionRouterOutlet.removeEventListener('ionViewDidEnter', this.ionViewDidEnterHandler.bind(this));
            this.ionRouterOutlet.removeEventListener('ionViewWillLeave', this.ionViewWillLeaveHandler.bind(this));
            this.ionRouterOutlet.removeEventListener('ionViewDidLeave', this.ionViewDidLeaveHandler.bind(this));
        }
    }
    ionViewWillEnterHandler() {
        this.ionLifeCycleContext.ionViewWillEnter();
    }
    ionViewDidEnterHandler() {
        this.ionLifeCycleContext.ionViewDidEnter();
    }
    ionViewWillLeaveHandler() {
        this.ionLifeCycleContext.ionViewWillLeave();
    }
    ionViewDidLeaveHandler() {
        this.ionLifeCycleContext.ionViewDidLeave();
    }
    render() {
        const _a = this.props, { StackManager, children, routeInfo } = _a, props = __rest(_a, ["StackManager", "children", "routeInfo"]);
        return (React.createElement(IonLifeCycleContext.Consumer, null, (context) => {
            this.ionLifeCycleContext = context;
            return (React.createElement(StackManager, { routeInfo: routeInfo },
                React.createElement(IonRouterOutletInner, Object.assign({ setRef: (val) => (this.ionRouterOutlet = val) }, props), children)));
        }));
    }
    static get contextType() {
        return StackContext;
    }
}

class IonRouterOutletContainer extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        const StackManager = this.context.getStackManager();
        const _a = this.props, { children, forwardedRef } = _a, props = __rest(_a, ["children", "forwardedRef"]);
        return this.context.hasIonicRouter() ? (props.ionPage ? (React.createElement(OutletPageManager, Object.assign({ StackManager: StackManager, routeInfo: this.context.routeInfo }, props), children)) : (React.createElement(StackManager, { routeInfo: this.context.routeInfo },
            React.createElement(IonRouterOutletInner, Object.assign({}, props, { forwardedRef: forwardedRef }), children)))) : (React.createElement(IonRouterOutletInner, Object.assign({ ref: forwardedRef }, this.props), this.props.children));
    }
    static get contextType() {
        return NavContext;
    }
}
const IonRouterOutlet = createForwardRef(IonRouterOutletContainer, 'IonRouterOutlet');

class IonTabButton extends React.Component {
    constructor(props) {
        super(props);
        this.handleIonTabButtonClick = this.handleIonTabButtonClick.bind(this);
    }
    handleIonTabButtonClick() {
        if (this.props.onClick) {
            this.props.onClick(new CustomEvent('ionTabButtonClick', {
                detail: {
                    tab: this.props.tab,
                    href: this.props.href,
                    routeOptions: this.props.routerOptions,
                },
            }));
        }
    }
    render() {
        const _a = this.props, rest = __rest(_a, ["onClick"]);
        return (React.createElement(IonTabButtonInner, Object.assign({ onIonTabButtonClick: this.handleIonTabButtonClick }, rest)));
    }
    static get displayName() {
        return 'IonTabButton';
    }
}

class IonTabBarUnwrapped extends React.PureComponent {
    constructor(props) {
        super(props);
        this.setActiveTabOnContext = (_tab) => { };
        const tabs = {};
        React.Children.forEach(props.children, (child) => {
            var _a, _b, _c, _d;
            if (child != null &&
                typeof child === 'object' &&
                child.props &&
                child.type === IonTabButton) {
                tabs[child.props.tab] = {
                    originalHref: child.props.href,
                    currentHref: child.props.href,
                    originalRouteOptions: child.props.href === ((_a = props.routeInfo) === null || _a === void 0 ? void 0 : _a.pathname)
                        ? (_b = props.routeInfo) === null || _b === void 0 ? void 0 : _b.routeOptions : undefined,
                    currentRouteOptions: child.props.href === ((_c = props.routeInfo) === null || _c === void 0 ? void 0 : _c.pathname)
                        ? (_d = props.routeInfo) === null || _d === void 0 ? void 0 : _d.routeOptions : undefined,
                };
            }
        });
        this.state = {
            tabs,
        };
        this.onTabButtonClick = this.onTabButtonClick.bind(this);
        this.renderTabButton = this.renderTabButton.bind(this);
        this.setActiveTabOnContext = this.setActiveTabOnContext.bind(this);
        this.selectTab = this.selectTab.bind(this);
    }
    componentDidMount() {
        const tabs = this.state.tabs;
        const tabKeys = Object.keys(tabs);
        const activeTab = tabKeys.find((key) => {
            const href = tabs[key].originalHref;
            return this.props.routeInfo.pathname.startsWith(href);
        });
        if (activeTab) {
            this.setState({
                activeTab,
            });
        }
    }
    componentDidUpdate() {
        if (this.state.activeTab) {
            this.setActiveTabOnContext(this.state.activeTab);
        }
    }
    selectTab(tab) {
        const tabUrl = this.state.tabs[tab];
        if (tabUrl) {
            this.onTabButtonClick(new CustomEvent('ionTabButtonClick', {
                detail: {
                    href: tabUrl.currentHref,
                    tab,
                    selected: tab === this.state.activeTab,
                    routeOptions: undefined,
                },
            }));
            return true;
        }
        return false;
    }
    static getDerivedStateFromProps(props, state) {
        var _a, _b, _c;
        const tabs = Object.assign({}, state.tabs);
        const tabKeys = Object.keys(state.tabs);
        const activeTab = tabKeys.find((key) => {
            const href = state.tabs[key].originalHref;
            return props.routeInfo.pathname.startsWith(href);
        });
        // Check to see if the tab button href has changed, and if so, update it in the tabs state
        React.Children.forEach(props.children, (child) => {
            if (child != null &&
                typeof child === 'object' &&
                child.props &&
                child.type === IonTabButton) {
                const tab = tabs[child.props.tab];
                if (!tab || tab.originalHref !== child.props.href) {
                    tabs[child.props.tab] = {
                        originalHref: child.props.href,
                        currentHref: child.props.href,
                        originalRouteOptions: child.props.routeOptions,
                        currentRouteOptions: child.props.routeOptions,
                    };
                }
            }
        });
        const { activeTab: prevActiveTab } = state;
        if (activeTab && prevActiveTab) {
            const prevHref = state.tabs[prevActiveTab].currentHref;
            const prevRouteOptions = state.tabs[prevActiveTab].currentRouteOptions;
            if (activeTab !== prevActiveTab ||
                prevHref !== ((_a = props.routeInfo) === null || _a === void 0 ? void 0 : _a.pathname) ||
                prevRouteOptions !== ((_b = props.routeInfo) === null || _b === void 0 ? void 0 : _b.routeOptions)) {
                tabs[activeTab] = {
                    originalHref: tabs[activeTab].originalHref,
                    currentHref: props.routeInfo.pathname + (props.routeInfo.search || ''),
                    originalRouteOptions: tabs[activeTab].originalRouteOptions,
                    currentRouteOptions: (_c = props.routeInfo) === null || _c === void 0 ? void 0 : _c.routeOptions,
                };
                if (props.routeInfo.routeAction === 'pop' && activeTab !== prevActiveTab) {
                    // If navigating back and the tabs change, set the prev tab back to its original href
                    tabs[prevActiveTab] = {
                        originalHref: tabs[prevActiveTab].originalHref,
                        currentHref: tabs[prevActiveTab].originalHref,
                        originalRouteOptions: tabs[prevActiveTab].originalRouteOptions,
                        currentRouteOptions: tabs[prevActiveTab].currentRouteOptions,
                    };
                }
            }
        }
        activeTab && props.onSetCurrentTab(activeTab, props.routeInfo);
        return {
            activeTab,
            tabs,
        };
    }
    onTabButtonClick(e) {
        const tappedTab = this.state.tabs[e.detail.tab];
        const originalHref = tappedTab.originalHref;
        const currentHref = e.detail.href;
        const { activeTab: prevActiveTab } = this.state;
        // this.props.onSetCurrentTab(e.detail.tab, this.props.routeInfo);
        // Clicking the current tab will bring you back to the original href
        if (prevActiveTab === e.detail.tab) {
            if (originalHref !== currentHref) {
                this.context.resetTab(e.detail.tab, originalHref, tappedTab.originalRouteOptions);
            }
        }
        else {
            if (this.props.onIonTabsWillChange) {
                this.props.onIonTabsWillChange(new CustomEvent('ionTabWillChange', { detail: { tab: e.detail.tab } }));
            }
            if (this.props.onIonTabsDidChange) {
                this.props.onIonTabsDidChange(new CustomEvent('ionTabDidChange', { detail: { tab: e.detail.tab } }));
            }
            this.setActiveTabOnContext(e.detail.tab);
            this.context.changeTab(e.detail.tab, currentHref, e.detail.routeOptions);
        }
    }
    renderTabButton(activeTab) {
        return (child) => {
            var _a, _b;
            if (child != null && child.props && child.type === IonTabButton) {
                const href = child.props.tab === activeTab
                    ? (_a = this.props.routeInfo) === null || _a === void 0 ? void 0 : _a.pathname : this.state.tabs[child.props.tab].currentHref;
                const routeOptions = child.props.tab === activeTab
                    ? (_b = this.props.routeInfo) === null || _b === void 0 ? void 0 : _b.routeOptions : this.state.tabs[child.props.tab].currentRouteOptions;
                return React.cloneElement(child, {
                    href,
                    routeOptions,
                    onClick: this.onTabButtonClick,
                });
            }
            return null;
        };
    }
    render() {
        const { activeTab } = this.state;
        return (React.createElement(IonTabBarInner, Object.assign({}, this.props, { selectedTab: activeTab }), React.Children.map(this.props.children, this.renderTabButton(activeTab))));
    }
    static get contextType() {
        return NavContext;
    }
}
const IonTabBarContainer = React.memo((_a) => {
    var { forwardedRef } = _a, props = __rest(_a, ["forwardedRef"]);
    const context = useContext(NavContext);
    return (React.createElement(IonTabBarUnwrapped, Object.assign({ ref: forwardedRef }, props, { routeInfo: props.routeInfo || context.routeInfo || { pathname: window.location.pathname }, onSetCurrentTab: context.setCurrentTab }), props.children));
});
const IonTabBar = createForwardRef(IonTabBarContainer, 'IonTabBar');

class IonTabsElement extends HTMLElement {
    constructor() {
        super();
    }
}
if (window && window.customElements) {
    const element = customElements.get('ion-tabs');
    if (!element) {
        customElements.define('ion-tabs', IonTabsElement);
    }
}
const hostStyles = {
    display: 'flex',
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    contain: 'layout size style',
};
const tabsInner = {
    position: 'relative',
    flex: 1,
    contain: 'layout size style',
};
class IonTabs extends React.Component {
    constructor(props) {
        super(props);
        this.routerOutletRef = React.createRef();
        this.tabBarRef = React.createRef();
        this.ionTabContextState = {
            activeTab: undefined,
            selectTab: () => false,
        };
    }
    componentDidMount() {
        if (this.tabBarRef.current) {
            // Grab initial value
            this.ionTabContextState.activeTab = this.tabBarRef.current.state.activeTab;
            // Override method
            this.tabBarRef.current.setActiveTabOnContext = (tab) => {
                this.ionTabContextState.activeTab = tab;
            };
            this.ionTabContextState.selectTab = this.tabBarRef.current.selectTab;
        }
    }
    render() {
        let outlet;
        let tabBar;
        const children = typeof this.props.children === 'function'
            ? this.props.children(this.ionTabContextState)
            : this.props.children;
        React.Children.forEach(children, (child) => {
            if (child == null || typeof child !== 'object' || !child.hasOwnProperty('type')) {
                return;
            }
            if (child.type === IonRouterOutlet) {
                outlet = React.cloneElement(child, { tabs: true });
            }
            else if (child.type === Fragment && child.props.children[0].type === IonRouterOutlet) {
                outlet = child.props.children[0];
            }
            if (child.type === IonTabBar) {
                const { onIonTabsDidChange, onIonTabsWillChange } = this.props;
                tabBar = React.cloneElement(child, {
                    onIonTabsDidChange,
                    onIonTabsWillChange,
                    ref: this.tabBarRef,
                });
            }
            else if (child.type === Fragment && child.props.children[1].type === IonTabBar) {
                const { onIonTabsDidChange, onIonTabsWillChange } = this.props;
                tabBar = React.cloneElement(child.props.children[1], {
                    onIonTabsDidChange,
                    onIonTabsWillChange,
                    ref: this.tabBarRef,
                });
            }
        });
        if (!outlet) {
            throw new Error('IonTabs must contain an IonRouterOutlet');
        }
        if (!tabBar) {
            throw new Error('IonTabs needs a IonTabBar');
        }
        const _a = this.props, { className } = _a, props = __rest(_a, ["className"]);
        return (React.createElement(IonTabsContext.Provider, { value: this.ionTabContextState }, this.context.hasIonicRouter() ? (React.createElement(PageManager, Object.assign({ className: className ? `${className}` : '', routeInfo: this.context.routeInfo }, props),
            React.createElement("ion-tabs", { className: "ion-tabs", style: hostStyles },
                tabBar.props.slot === 'top' ? tabBar : null,
                React.createElement("div", { style: tabsInner, className: "tabs-inner" }, outlet),
                tabBar.props.slot === 'bottom' ? tabBar : null))) : (React.createElement("div", Object.assign({ className: className ? `${className}` : 'ion-tabs' }, props, { style: hostStyles }),
            tabBar.props.slot === 'top' ? tabBar : null,
            React.createElement("div", { style: tabsInner, className: "tabs-inner" }, outlet),
            tabBar.props.slot === 'bottom' ? tabBar : null))));
    }
    static get contextType() {
        return NavContext;
    }
}

const IonBackButton = /*@__PURE__*/ (() => class extends React.Component {
    constructor() {
        super(...arguments);
        this.clickButton = (e) => {
            const { defaultHref, routerAnimation } = this.props;
            if (this.context.hasIonicRouter()) {
                e.stopPropagation();
                this.context.goBack(defaultHref, routerAnimation);
            }
            else if (defaultHref !== undefined) {
                window.location.href = defaultHref;
            }
        };
    }
    render() {
        return React.createElement(IonBackButtonInner, Object.assign({ onClick: this.clickButton }, this.props));
    }
    static get displayName() {
        return 'IonBackButton';
    }
    static get contextType() {
        return NavContext;
    }
})();

const isDevMode = () => {
    return process && process.env && process.env.NODE_ENV === 'development';
};
const warnings = {};
const deprecationWarning = (key, message) => {
    if (isDevMode()) {
        if (!warnings[key]) {
            console.warn(message);
            warnings[key] = true;
        }
    }
};

class IonIconContainer extends React.PureComponent {
    constructor(props) {
        super(props);
        if (this.props.name) {
            deprecationWarning('icon-name', 'In Ionic React, you import icons from "ionicons/icons" and set the icon you imported to the "icon" property. Setting the "name" property has no effect.');
        }
    }
    render() {
        var _a, _b;
        const _c = this.props, { icon, ios, md } = _c, rest = __rest(_c, ["icon", "ios", "md"]);
        let iconToUse;
        if (ios || md) {
            if (isPlatform('ios')) {
                iconToUse = (_a = ios !== null && ios !== void 0 ? ios : md) !== null && _a !== void 0 ? _a : icon;
            }
            else {
                iconToUse = (_b = md !== null && md !== void 0 ? md : ios) !== null && _b !== void 0 ? _b : icon;
            }
        }
        else {
            iconToUse = icon;
        }
        return (React.createElement(IonIconInner, Object.assign({ ref: this.props.forwardedRef, icon: iconToUse }, rest), this.props.children));
    }
    static get contextType() {
        return NavContext;
    }
}
const IonIcon = createForwardRef(IonIconContainer, 'IonIcon');

class IonRoute extends React.PureComponent {
    render() {
        const IonRouteInner = this.context.getIonRoute();
        if (!this.context.hasIonicRouter() || !IonRoute) {
            console.error('You either do not have an Ionic Router package, or your router does not support using <IonRoute>');
            return null;
        }
        return React.createElement(IonRouteInner, Object.assign({}, this.props));
    }
    static get contextType() {
        return NavContext;
    }
}

class IonRedirect extends React.PureComponent {
    render() {
        const IonRedirectInner = this.context.getIonRedirect();
        if (!this.context.hasIonicRouter() || !IonRedirect) {
            console.error('You either do not have an Ionic Router package, or your router does not support using <IonRedirect>');
            return null;
        }
        return React.createElement(IonRedirectInner, Object.assign({}, this.props));
    }
    static get contextType() {
        return NavContext;
    }
}

const IonRouterContext = React.createContext({
    routeInfo: undefined,
    push: () => {
        throw new Error('An Ionic Router is required for IonRouterContext');
    },
    back: () => {
        throw new Error('An Ionic Router is required for IonRouterContext');
    },
    canGoBack: () => {
        throw new Error('An Ionic Router is required for IonRouterContext');
    },
    nativeBack: () => {
        throw new Error('An Ionic Router is required for IonRouterContext');
    },
});
/**
 * A hook for more direct control over routing in an Ionic React applicaiton. Allows you to pass additional meta-data to the router before the call to the native router.
 */
function useIonRouter() {
    const context = useContext(IonRouterContext);
    return {
        back: context.back,
        push: context.push,
        goBack: context.back,
        canGoBack: context.canGoBack,
    };
}

class CreateAnimation extends React.PureComponent {
    constructor(props) {
        super(props);
        this.nodes = new Map();
        this.animation = createAnimation(props.id);
    }
    setupAnimation(props) {
        const animation = this.animation;
        if (this.nodes.size > 0) {
            animation.addElement(Array.from(this.nodes.values()));
        }
        checkConfig(animation, props);
        checkPlayback(animation, props);
    }
    componentDidMount() {
        const props = this.props;
        this.setupAnimation(props);
    }
    componentDidUpdate(prevProps) {
        const animation = this.animation;
        const props = this.props;
        checkConfig(animation, props, prevProps);
        checkProgress(animation, props, prevProps);
        checkPlayback(animation, props, prevProps);
    }
    render() {
        const { children } = this.props;
        return (React.createElement(React.Fragment, null, React.Children.map(children, (child, id) => React.cloneElement(child, { ref: (el) => this.nodes.set(id, el) }))));
    }
}
const checkConfig = (animation, currentProps = {}, prevProps = {}) => {
    const reservedProps = [
        'children',
        'progressStart',
        'progressStep',
        'progressEnd',
        'pause',
        'stop',
        'destroy',
        'play',
        'from',
        'to',
        'fromTo',
        'onFinish',
    ];
    for (const key in currentProps) {
        if (currentProps.hasOwnProperty(key) &&
            !reservedProps.includes(key) &&
            currentProps[key] !== prevProps[key]) {
            animation[key](currentProps[key]);
        }
    }
    const fromValues = currentProps.from;
    if (fromValues && fromValues !== prevProps.from) {
        const values = Array.isArray(fromValues) ? fromValues : [fromValues];
        values.forEach((val) => animation.from(val.property, val.value));
    }
    const toValues = currentProps.to;
    if (toValues && toValues !== prevProps.to) {
        const values = Array.isArray(toValues) ? toValues : [toValues];
        values.forEach((val) => animation.to(val.property, val.value));
    }
    const fromToValues = currentProps.fromTo;
    if (fromToValues && fromToValues !== prevProps.fromTo) {
        const values = Array.isArray(fromToValues) ? fromToValues : [fromToValues];
        values.forEach((val) => animation.fromTo(val.property, val.fromValue, val.toValue));
    }
    const onFinishValues = currentProps.onFinish;
    if (onFinishValues && onFinishValues !== prevProps.onFinish) {
        const values = Array.isArray(onFinishValues) ? onFinishValues : [onFinishValues];
        values.forEach((val) => animation.onFinish(val.callback, val.opts));
    }
};
const checkProgress = (animation, currentProps = {}, prevProps = {}) => {
    var _a, _b, _c, _d, _e;
    const { progressStart, progressStep, progressEnd } = currentProps;
    if (progressStart &&
        (((_a = prevProps.progressStart) === null || _a === void 0 ? void 0 : _a.forceLinearEasing) !== (progressStart === null || progressStart === void 0 ? void 0 : progressStart.forceLinearEasing) ||
            ((_b = prevProps.progressStart) === null || _b === void 0 ? void 0 : _b.step) !== (progressStart === null || progressStart === void 0 ? void 0 : progressStart.step))) {
        animation.progressStart(progressStart.forceLinearEasing, progressStart.step);
    }
    if (progressStep && ((_c = prevProps.progressStep) === null || _c === void 0 ? void 0 : _c.step) !== (progressStep === null || progressStep === void 0 ? void 0 : progressStep.step)) {
        animation.progressStep(progressStep.step);
    }
    if (progressEnd &&
        (((_d = prevProps.progressEnd) === null || _d === void 0 ? void 0 : _d.playTo) !== (progressEnd === null || progressEnd === void 0 ? void 0 : progressEnd.playTo) ||
            ((_e = prevProps.progressEnd) === null || _e === void 0 ? void 0 : _e.step) !== (progressEnd === null || progressEnd === void 0 ? void 0 : progressEnd.step) ||
            (prevProps === null || prevProps === void 0 ? void 0 : prevProps.dur) !== (progressEnd === null || progressEnd === void 0 ? void 0 : progressEnd.dur))) {
        animation.progressEnd(progressEnd.playTo, progressEnd.step, progressEnd.dur);
    }
};
const checkPlayback = (animation, currentProps = {}, prevProps = {}) => {
    if (!prevProps.play && currentProps.play) {
        animation.play();
    }
    if (!prevProps.pause && currentProps.pause) {
        animation.pause();
    }
    if (!prevProps.stop && currentProps.stop) {
        animation.stop();
    }
    if (!prevProps.destroy && currentProps.destroy) {
        animation.destroy();
    }
};

// Icons that are used by internal components
addIcons({
    'arrow-back-sharp': arrowBackSharp,
    'caret-back-sharp': caretBackSharp,
    'chevron-back': chevronBack,
    'chevron-forward': chevronForward,
    close,
    'close-circle': closeCircle,
    'close-sharp': closeSharp,
    'menu-outline': menuOutline,
    'menu-sharp': menuSharp,
    'reorder-two-sharp': reorderTwoSharp,
    'reorder-three-outline': reorderThreeOutline,
    'search-outline': searchOutline,
    'search-sharp': searchSharp,
});
// TODO: defineCustomElements() is asyncronous
// We need to use the promise
if (typeof window !== 'undefined') {
    defineCustomElements(window);
}

const RouteManagerContext = /*@__PURE__*/ React.createContext({
    addViewItem: () => undefined,
    canGoBack: () => undefined,
    clearOutlet: () => undefined,
    createViewItem: () => undefined,
    findViewItemByPathname: () => undefined,
    findLeavingViewItemByRouteInfo: () => undefined,
    findViewItemByRouteInfo: () => undefined,
    getChildrenToRender: () => undefined,
    goBack: () => undefined,
    unMountViewItem: () => undefined,
});

class ViewLifeCycleManager extends React.Component {
    constructor(props) {
        super(props);
        this.ionLifeCycleContext = new DefaultIonLifeCycleContext();
        this._isMounted = false;
        this.ionLifeCycleContext.onComponentCanBeDestroyed(() => {
            if (!this.props.mount) {
                if (this._isMounted) {
                    this.setState({
                        show: false,
                    }, () => this.props.removeView());
                }
            }
        });
        this.state = {
            show: true,
        };
    }
    componentDidMount() {
        this._isMounted = true;
    }
    componentWillUnmount() {
        this._isMounted = false;
    }
    render() {
        const { show } = this.state;
        return (React.createElement(IonLifeCycleContext.Provider, { value: this.ionLifeCycleContext }, show && this.props.children));
    }
}

// const RESTRICT_SIZE = 100;
class LocationHistory {
    constructor() {
        this.locationHistory = [];
        this.tabHistory = {};
    }
    add(routeInfo) {
        if (routeInfo.routeAction === 'push' || routeInfo.routeAction == null) {
            this._add(routeInfo);
        }
        else if (routeInfo.routeAction === 'pop') {
            this._pop(routeInfo);
        }
        else if (routeInfo.routeAction === 'replace') {
            this._replace(routeInfo);
        }
        if (routeInfo.routeDirection === 'root') {
            this._clear();
            this._add(routeInfo);
        }
    }
    clearTabStack(tab) {
        const routeInfos = this._getRouteInfosByKey(tab);
        if (routeInfos) {
            routeInfos.forEach((ri) => {
                this.locationHistory = this.locationHistory.filter((x) => x.id !== ri.id);
            });
            this.tabHistory[tab] = [];
        }
    }
    update(routeInfo) {
        const locationIndex = this.locationHistory.findIndex((x) => x.id === routeInfo.id);
        if (locationIndex > -1) {
            this.locationHistory.splice(locationIndex, 1, routeInfo);
        }
        const tabArray = this.tabHistory[routeInfo.tab || ''];
        if (tabArray) {
            const tabIndex = tabArray.findIndex((x) => x.id === routeInfo.id);
            if (tabIndex > -1) {
                tabArray.splice(tabIndex, 1, routeInfo);
            }
            else {
                tabArray.push(routeInfo);
            }
        }
        else if (routeInfo.tab) {
            this.tabHistory[routeInfo.tab] = [routeInfo];
        }
    }
    _add(routeInfo) {
        var _a;
        const routeInfos = this._getRouteInfosByKey(routeInfo.tab);
        if (routeInfos) {
            // If the latest routeInfo is the same (going back and forth between tabs), replace it
            if (((_a = routeInfos[routeInfos.length - 1]) === null || _a === void 0 ? void 0 : _a.id) === routeInfo.id) {
                routeInfos.pop();
            }
            routeInfos.push(routeInfo);
        }
        this.locationHistory.push(routeInfo);
    }
    _pop(routeInfo) {
        const routeInfos = this._getRouteInfosByKey(routeInfo.tab);
        let ri;
        if (routeInfos) {
            // Pop all routes until we are back
            ri = routeInfos[routeInfos.length - 1];
            while (ri && ri.id !== routeInfo.id) {
                routeInfos.pop();
                ri = routeInfos[routeInfos.length - 1];
            }
            // Replace with updated route
            routeInfos.pop();
            routeInfos.push(routeInfo);
        }
        ri = this.locationHistory[this.locationHistory.length - 1];
        while (ri && ri.id !== routeInfo.id) {
            this.locationHistory.pop();
            ri = this.locationHistory[this.locationHistory.length - 1];
        }
        // Replace with updated route
        this.locationHistory.pop();
        this.locationHistory.push(routeInfo);
    }
    _replace(routeInfo) {
        const routeInfos = this._getRouteInfosByKey(routeInfo.tab);
        routeInfos && routeInfos.pop();
        this.locationHistory.pop();
        this._add(routeInfo);
    }
    _clear() {
        const keys = Object.keys(this.tabHistory);
        keys.forEach((k) => (this.tabHistory[k] = []));
        this.locationHistory = [];
    }
    _getRouteInfosByKey(key) {
        let routeInfos;
        if (key) {
            routeInfos = this.tabHistory[key];
            if (!routeInfos) {
                routeInfos = this.tabHistory[key] = [];
            }
        }
        return routeInfos;
    }
    getFirstRouteInfoForTab(tab) {
        const routeInfos = this._getRouteInfosByKey(tab);
        if (routeInfos) {
            return routeInfos[0];
        }
        return undefined;
    }
    getCurrentRouteInfoForTab(tab) {
        const routeInfos = this._getRouteInfosByKey(tab);
        if (routeInfos) {
            return routeInfos[routeInfos.length - 1];
        }
        return undefined;
    }
    findLastLocation(routeInfo) {
        const routeInfos = this._getRouteInfosByKey(routeInfo.tab);
        if (routeInfos) {
            for (let i = routeInfos.length - 2; i >= 0; i--) {
                const ri = routeInfos[i];
                if (ri) {
                    if (ri.pathname === routeInfo.pushedByRoute) {
                        return ri;
                    }
                }
            }
        }
        for (let i = this.locationHistory.length - 2; i >= 0; i--) {
            const ri = this.locationHistory[i];
            if (ri) {
                if (ri.pathname === routeInfo.pushedByRoute) {
                    return ri;
                }
            }
        }
        return undefined;
    }
    previous() {
        return (this.locationHistory[this.locationHistory.length - 2] ||
            this.locationHistory[this.locationHistory.length - 1]);
    }
    current() {
        return this.locationHistory[this.locationHistory.length - 1];
    }
    canGoBack() {
        return this.locationHistory.length > 1;
    }
}

class NavManager extends React.PureComponent {
    constructor(props) {
        super(props);
        this.ionRouterContextValue = {
            push: (pathname, routerDirection, routeAction, routerOptions, animationBuilder) => {
                this.navigate(pathname, routerDirection, routeAction, animationBuilder, routerOptions);
            },
            back: (animationBuilder) => {
                this.goBack(undefined, animationBuilder);
            },
            canGoBack: () => this.props.locationHistory.canGoBack(),
            nativeBack: () => this.props.onNativeBack(),
            routeInfo: this.props.routeInfo,
        };
        this.state = {
            goBack: this.goBack.bind(this),
            hasIonicRouter: () => true,
            navigate: this.navigate.bind(this),
            getIonRedirect: this.getIonRedirect.bind(this),
            getIonRoute: this.getIonRoute.bind(this),
            getStackManager: this.getStackManager.bind(this),
            getPageManager: this.getPageManager.bind(this),
            routeInfo: this.props.routeInfo,
            setCurrentTab: this.props.onSetCurrentTab,
            changeTab: this.props.onChangeTab,
            resetTab: this.props.onResetTab,
        };
        if (typeof document !== 'undefined') {
            document.addEventListener('ionBackButton', (e) => {
                e.detail.register(0, (processNextHandler) => {
                    this.nativeGoBack();
                    processNextHandler();
                });
            });
        }
    }
    goBack(route, animationBuilder) {
        this.props.onNavigateBack(route, animationBuilder);
    }
    nativeGoBack() {
        this.props.onNativeBack();
    }
    navigate(path, direction = 'forward', action = 'push', animationBuilder, options, tab) {
        this.props.onNavigate(path, action, direction, animationBuilder, options, tab);
    }
    getPageManager() {
        return PageManager;
    }
    getIonRedirect() {
        return this.props.ionRedirect;
    }
    getIonRoute() {
        return this.props.ionRoute;
    }
    getStackManager() {
        return this.props.stackManager;
    }
    render() {
        return (React.createElement(NavContext.Provider, { value: Object.assign(Object.assign({}, this.state), { routeInfo: this.props.routeInfo }) },
            React.createElement(IonRouterContext.Provider, { value: Object.assign(Object.assign({}, this.ionRouterContextValue), { routeInfo: this.props.routeInfo }) }, this.props.children)));
    }
}

class ViewStacks {
    constructor() {
        this.viewStacks = {};
        this.add = this.add.bind(this);
        this.clear = this.clear.bind(this);
        this.getViewItemsForOutlet = this.getViewItemsForOutlet.bind(this);
        this.remove = this.remove.bind(this);
    }
    add(viewItem) {
        const { outletId } = viewItem;
        if (!this.viewStacks[outletId]) {
            this.viewStacks[outletId] = [viewItem];
        }
        else {
            this.viewStacks[outletId].push(viewItem);
        }
    }
    clear(outletId) {
        // Give some time for the leaving views to transition before removing
        setTimeout(() => {
            // console.log('Removing viewstack for outletID ' + outletId);
            delete this.viewStacks[outletId];
        }, 500);
    }
    getViewItemsForOutlet(outletId) {
        return this.viewStacks[outletId] || [];
    }
    remove(viewItem) {
        const { outletId } = viewItem;
        const viewStack = this.viewStacks[outletId];
        if (viewStack) {
            const viewItemToRemove = viewStack.find((x) => x.id === viewItem.id);
            if (viewItemToRemove) {
                viewItemToRemove.mount = false;
                this.viewStacks[outletId] = viewStack.filter((x) => x.id !== viewItemToRemove.id);
            }
        }
    }
    getStackIds() {
        return Object.keys(this.viewStacks);
    }
    getAllViewItems() {
        const keys = this.getStackIds();
        const viewItems = [];
        keys.forEach((k) => {
            viewItems.push(...this.viewStacks[k]);
        });
        return viewItems;
    }
}

const ids = { main: 0 };
const generateId = (type = 'main') => {
    var _a;
    const id = ((_a = ids[type]) !== null && _a !== void 0 ? _a : 0) + 1;
    ids[type] = id;
    return id.toString();
};

export { CreateAnimation, DefaultIonLifeCycleContext, IonActionSheet, IonAlert, IonApp, IonAvatar, IonBackButton, IonBackdrop, IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCheckbox, IonChip, IonCol, IonContent, IonDatetime, IonFab, IonFabButton, IonFabList, IonFooter, IonGrid, IonHeader, IonIcon, IonImg, IonInfiniteScroll, IonInfiniteScrollContent, IonInput, IonItem, IonItemDivider, IonItemGroup, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonLifeCycleContext, IonList, IonListHeader, IonLoading, IonMenu, IonMenuButton, IonMenuToggle, IonModal, IonNav, IonNote, IonPage, IonPicker, IonPickerColumn, IonPopover, IonProgressBar, IonRadio, IonRadioGroup, IonRange, IonRedirect, IonRefresher, IonRefresherContent, IonReorder, IonReorderGroup, IonRippleEffect, IonRoute, IonRouterContext, IonRouterLink, IonRouterOutlet, IonRow, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSelectPopover, IonSkeletonText, IonSlide, IonSlides, IonSpinner, IonSplitPane, IonTab, IonTabBar, IonTabButton, IonTabs, IonTabsContext, IonText, IonTextarea, IonThumbnail, IonTitle, IonToast, IonToggle, IonToolbar, IonVirtualScroll, LocationHistory, NavContext, NavManager, RouteManagerContext, StackContext, ViewLifeCycleManager, ViewStacks, generateId, getConfig, getPlatforms, isPlatform, useIonRouter, useIonViewDidEnter, useIonViewDidLeave, useIonViewWillEnter, useIonViewWillLeave, withIonLifeCycle };
//# sourceMappingURL=index.esm.js.map
