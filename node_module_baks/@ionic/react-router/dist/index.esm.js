import { __rest } from 'tslib';
import { createBrowserHistory, createHashHistory } from 'history';
import React from 'react';
import { matchPath as matchPath$1, withRouter, Router } from 'react-router-dom';
import { ViewStacks, generateId, IonRoute, ViewLifeCycleManager, StackContext, RouteManagerContext, getConfig, LocationHistory, NavManager } from '@ionic/react';
import { Route, matchPath, Router as Router$1 } from 'react-router';

class IonRouteInner extends React.PureComponent {
    render() {
        return (React.createElement(Route, { path: this.props.path, exact: this.props.exact, render: this.props.render, computedMatch: this.props.computedMatch }));
    }
}

class ReactRouterViewStack extends ViewStacks {
    constructor() {
        super();
        this.createViewItem = this.createViewItem.bind(this);
        this.findViewItemByRouteInfo = this.findViewItemByRouteInfo.bind(this);
        this.findLeavingViewItemByRouteInfo = this.findLeavingViewItemByRouteInfo.bind(this);
        this.getChildrenToRender = this.getChildrenToRender.bind(this);
        this.findViewItemByPathname = this.findViewItemByPathname.bind(this);
    }
    createViewItem(outletId, reactElement, routeInfo, page) {
        const viewItem = {
            id: generateId('viewItem'),
            outletId,
            ionPageElement: page,
            reactElement,
            mount: true,
            ionRoute: false,
        };
        const matchProps = {
            exact: reactElement.props.exact,
            path: reactElement.props.path || reactElement.props.from,
            component: reactElement.props.component,
        };
        const match = matchPath(routeInfo.pathname, matchProps);
        if (reactElement.type === IonRoute) {
            viewItem.ionRoute = true;
            viewItem.disableIonPageManagement = reactElement.props.disableIonPageManagement;
        }
        viewItem.routeData = {
            match,
            childProps: reactElement.props,
        };
        return viewItem;
    }
    getChildrenToRender(outletId, ionRouterOutlet, routeInfo) {
        const viewItems = this.getViewItemsForOutlet(outletId);
        // Sync latest routes with viewItems
        React.Children.forEach(ionRouterOutlet.props.children, (child) => {
            const viewItem = viewItems.find((v) => {
                return matchComponent(child, v.routeData.childProps.path || v.routeData.childProps.from);
            });
            if (viewItem) {
                viewItem.reactElement = child;
            }
        });
        const children = viewItems.map((viewItem) => {
            let clonedChild;
            if (viewItem.ionRoute && !viewItem.disableIonPageManagement) {
                clonedChild = (React.createElement(ViewLifeCycleManager, { key: `view-${viewItem.id}`, mount: viewItem.mount, removeView: () => this.remove(viewItem) }, React.cloneElement(viewItem.reactElement, {
                    computedMatch: viewItem.routeData.match,
                })));
            }
            else {
                const match = matchComponent(viewItem.reactElement, routeInfo.pathname);
                clonedChild = (React.createElement(ViewLifeCycleManager, { key: `view-${viewItem.id}`, mount: viewItem.mount, removeView: () => this.remove(viewItem) }, React.cloneElement(viewItem.reactElement, {
                    computedMatch: viewItem.routeData.match,
                })));
                if (!match && viewItem.routeData.match) {
                    viewItem.routeData.match = undefined;
                    viewItem.mount = false;
                }
            }
            return clonedChild;
        });
        return children;
    }
    findViewItemByRouteInfo(routeInfo, outletId) {
        const { viewItem, match } = this.findViewItemByPath(routeInfo.pathname, outletId);
        if (viewItem && match) {
            viewItem.routeData.match = match;
        }
        return viewItem;
    }
    findLeavingViewItemByRouteInfo(routeInfo, outletId, mustBeIonRoute = true) {
        const { viewItem } = this.findViewItemByPath(routeInfo.lastPathname, outletId, false, mustBeIonRoute);
        return viewItem;
    }
    findViewItemByPathname(pathname, outletId) {
        const { viewItem } = this.findViewItemByPath(pathname, outletId);
        return viewItem;
    }
    findViewItemByPath(pathname, outletId, forceExact, mustBeIonRoute) {
        let viewItem;
        let match;
        let viewStack;
        if (outletId) {
            viewStack = this.getViewItemsForOutlet(outletId);
            viewStack.some(matchView);
            if (!viewItem) {
                viewStack.some(matchDefaultRoute);
            }
        }
        else {
            const viewItems = this.getAllViewItems();
            viewItems.some(matchView);
            if (!viewItem) {
                viewItems.some(matchDefaultRoute);
            }
        }
        return { viewItem, match };
        function matchView(v) {
            if (mustBeIonRoute && !v.ionRoute) {
                return false;
            }
            const matchProps = {
                exact: forceExact ? true : v.routeData.childProps.exact,
                path: v.routeData.childProps.path || v.routeData.childProps.from,
                component: v.routeData.childProps.component,
            };
            const myMatch = matchPath(pathname, matchProps);
            if (myMatch) {
                viewItem = v;
                match = myMatch;
                return true;
            }
            return false;
        }
        function matchDefaultRoute(v) {
            // try to find a route that doesn't have a path or from prop, that will be our default route
            if (!v.routeData.childProps.path && !v.routeData.childProps.from) {
                match = {
                    path: pathname,
                    url: pathname,
                    isExact: true,
                    params: {},
                };
                viewItem = v;
                return true;
            }
            return false;
        }
    }
}
function matchComponent(node, pathname, forceExact) {
    const matchProps = {
        exact: forceExact ? true : node.props.exact,
        path: node.props.path || node.props.from,
        component: node.props.component,
    };
    const match = matchPath(pathname, matchProps);
    return match;
}

function clonePageElement(leavingViewHtml) {
    let html;
    if (typeof leavingViewHtml === 'string') {
        html = leavingViewHtml;
    }
    else {
        html = leavingViewHtml.outerHTML;
    }
    if (document) {
        const newEl = document.createElement('div');
        newEl.innerHTML = html;
        newEl.style.zIndex = '';
        // Remove an existing back button so the new element doesn't get two of them
        const ionBackButton = newEl.getElementsByTagName('ion-back-button');
        if (ionBackButton[0]) {
            ionBackButton[0].remove();
        }
        return newEl.firstChild;
    }
    return undefined;
}

class StackManager extends React.PureComponent {
    constructor(props) {
        super(props);
        this.stackContextValue = {
            registerIonPage: this.registerIonPage.bind(this),
            isInOutlet: () => true,
        };
        this.registerIonPage = this.registerIonPage.bind(this);
        this.transitionPage = this.transitionPage.bind(this);
        this.handlePageTransition = this.handlePageTransition.bind(this);
        this.id = generateId('routerOutlet');
    }
    componentDidMount() {
        if (this.routerOutletElement) {
            this.setupRouterOutlet(this.routerOutletElement);
            // console.log(`SM Mount - ${this.routerOutletElement.id} (${this.id})`);
            this.handlePageTransition(this.props.routeInfo);
        }
    }
    componentDidUpdate(prevProps) {
        if (this.props.routeInfo.pathname !== prevProps.routeInfo.pathname) {
            this.handlePageTransition(this.props.routeInfo);
        }
    }
    componentWillUnmount() {
        // console.log(`SM UNMount - ${(this.routerOutletElement?.id as any).id} (${this.id})`);
        this.context.clearOutlet(this.id);
    }
    async handlePageTransition(routeInfo) {
        var _a, _b;
        // If routerOutlet isn't quite ready, give it another try in a moment
        if (!this.routerOutletElement || !this.routerOutletElement.commit) {
            setTimeout(() => this.handlePageTransition(routeInfo), 10);
        }
        else {
            let enteringViewItem = this.context.findViewItemByRouteInfo(routeInfo, this.id);
            let leavingViewItem = this.context.findLeavingViewItemByRouteInfo(routeInfo, this.id);
            if (!leavingViewItem && routeInfo.prevRouteLastPathname) {
                leavingViewItem = this.context.findViewItemByPathname(routeInfo.prevRouteLastPathname, this.id);
            }
            // Check if leavingViewItem should be unmounted
            if (leavingViewItem) {
                if (routeInfo.routeAction === 'replace') {
                    leavingViewItem.mount = false;
                }
                else if (!(routeInfo.routeAction === 'push' && routeInfo.routeDirection === 'forward')) {
                    if (routeInfo.routeDirection !== 'none' && enteringViewItem !== leavingViewItem) {
                        leavingViewItem.mount = false;
                    }
                }
                else if ((_a = routeInfo.routeOptions) === null || _a === void 0 ? void 0 : _a.unmount) {
                    leavingViewItem.mount = false;
                }
            }
            const enteringRoute = matchRoute((_b = this.ionRouterOutlet) === null || _b === void 0 ? void 0 : _b.props.children, routeInfo);
            if (enteringViewItem) {
                enteringViewItem.reactElement = enteringRoute;
            }
            if (!enteringViewItem) {
                if (enteringRoute) {
                    enteringViewItem = this.context.createViewItem(this.id, enteringRoute, routeInfo);
                    this.context.addViewItem(enteringViewItem);
                }
            }
            if (enteringViewItem && enteringViewItem.ionPageElement) {
                this.transitionPage(routeInfo, enteringViewItem, leavingViewItem);
            }
            else if (leavingViewItem && !enteringRoute && !enteringViewItem) {
                // If we have a leavingView but no entering view/route, we are probably leaving to
                // another outlet, so hide this leavingView. We do it in a timeout to give time for a
                // transition to finish.
                // setTimeout(() => {
                if (leavingViewItem.ionPageElement) {
                    leavingViewItem.ionPageElement.classList.add('ion-page-hidden');
                    leavingViewItem.ionPageElement.setAttribute('aria-hidden', 'true');
                }
                // }, 250);
            }
            this.forceUpdate();
        }
    }
    registerIonPage(page, routeInfo) {
        const foundView = this.context.findViewItemByRouteInfo(routeInfo, this.id);
        if (foundView) {
            foundView.ionPageElement = page;
            foundView.ionRoute = true;
        }
        this.handlePageTransition(routeInfo);
    }
    async setupRouterOutlet(routerOutlet) {
        const canStart = () => {
            const config = getConfig();
            const swipeEnabled = config && config.get('swipeBackEnabled', routerOutlet.mode === 'ios');
            if (swipeEnabled) {
                return this.context.canGoBack();
            }
            else {
                return false;
            }
        };
        const onStart = () => {
            this.context.goBack();
        };
        routerOutlet.swipeHandler = {
            canStart,
            onStart,
            onEnd: (_shouldContinue) => true,
        };
    }
    async transitionPage(routeInfo, enteringViewItem, leavingViewItem) {
        const routerOutlet = this.routerOutletElement;
        const direction = routeInfo.routeDirection === 'none' || routeInfo.routeDirection === 'root'
            ? undefined
            : routeInfo.routeDirection;
        if (enteringViewItem && enteringViewItem.ionPageElement && this.routerOutletElement) {
            if (leavingViewItem &&
                leavingViewItem.ionPageElement &&
                enteringViewItem === leavingViewItem) {
                // If a page is transitioning to another version of itself
                // we clone it so we can have an animation to show
                const match = matchComponent$1(leavingViewItem.reactElement, routeInfo.pathname, true);
                if (match) {
                    const newLeavingElement = clonePageElement(leavingViewItem.ionPageElement.outerHTML);
                    if (newLeavingElement) {
                        this.routerOutletElement.appendChild(newLeavingElement);
                        await runCommit(enteringViewItem.ionPageElement, newLeavingElement);
                        this.routerOutletElement.removeChild(newLeavingElement);
                    }
                }
                else {
                    await runCommit(enteringViewItem.ionPageElement, undefined);
                }
            }
            else {
                await runCommit(enteringViewItem.ionPageElement, leavingViewItem === null || leavingViewItem === void 0 ? void 0 : leavingViewItem.ionPageElement);
                if (leavingViewItem && leavingViewItem.ionPageElement) {
                    leavingViewItem.ionPageElement.classList.add('ion-page-hidden');
                    leavingViewItem.ionPageElement.setAttribute('aria-hidden', 'true');
                }
            }
        }
        async function runCommit(enteringEl, leavingEl) {
            enteringEl.classList.add('ion-page');
            enteringEl.classList.add('ion-page-invisible');
            await routerOutlet.commit(enteringEl, leavingEl, {
                deepWait: true,
                duration: direction === undefined ? 0 : undefined,
                direction: direction,
                showGoBack: direction === 'forward',
                progressAnimation: false,
                animationBuilder: routeInfo.routeAnimation,
            });
        }
    }
    render() {
        const { children } = this.props;
        const ionRouterOutlet = React.Children.only(children);
        this.ionRouterOutlet = ionRouterOutlet;
        const components = this.context.getChildrenToRender(this.id, this.ionRouterOutlet, this.props.routeInfo, () => {
            this.forceUpdate();
        });
        return (React.createElement(StackContext.Provider, { value: this.stackContextValue }, React.cloneElement(ionRouterOutlet, {
            ref: (node) => {
                if (ionRouterOutlet.props.setRef) {
                    ionRouterOutlet.props.setRef(node);
                }
                if (ionRouterOutlet.props.forwardedRef) {
                    ionRouterOutlet.props.forwardedRef.current = node;
                }
                this.routerOutletElement = node;
                const { ref } = ionRouterOutlet;
                if (typeof ref === 'function') {
                    ref(node);
                }
            },
        }, components)));
    }
    static get contextType() {
        return RouteManagerContext;
    }
}
function matchRoute(node, routeInfo) {
    let matchedNode;
    React.Children.forEach(node, (child) => {
        const matchProps = {
            exact: child.props.exact,
            path: child.props.path || child.props.from,
            component: child.props.component,
        };
        const match = matchPath$1(routeInfo.pathname, matchProps);
        if (match) {
            matchedNode = child;
        }
    });
    if (matchedNode) {
        return matchedNode;
    }
    // If we haven't found a node
    // try to find one that doesn't have a path or from prop, that will be our not found route
    React.Children.forEach(node, (child) => {
        if (!(child.props.path || child.props.from)) {
            matchedNode = child;
        }
    });
    return matchedNode;
}
function matchComponent$1(node, pathname, forceExact) {
    const matchProps = {
        exact: forceExact ? true : node.props.exact,
        path: node.props.path || node.props.from,
        component: node.props.component,
    };
    const match = matchPath$1(pathname, matchProps);
    return match;
}

class IonRouterInner extends React.PureComponent {
    constructor(props) {
        super(props);
        this.exitViewFromOtherOutletHandlers = [];
        this.locationHistory = new LocationHistory();
        this.viewStack = new ReactRouterViewStack();
        this.routeMangerContextState = {
            canGoBack: () => this.locationHistory.canGoBack(),
            clearOutlet: this.viewStack.clear,
            findViewItemByPathname: this.viewStack.findViewItemByPathname,
            getChildrenToRender: this.viewStack.getChildrenToRender,
            goBack: () => this.handleNavigateBack(),
            createViewItem: this.viewStack.createViewItem,
            findViewItemByRouteInfo: this.viewStack.findViewItemByRouteInfo,
            findLeavingViewItemByRouteInfo: this.viewStack.findLeavingViewItemByRouteInfo,
            addViewItem: this.viewStack.add,
            unMountViewItem: this.viewStack.remove,
        };
        const routeInfo = {
            id: generateId('routeInfo'),
            pathname: this.props.location.pathname,
            search: this.props.location.search,
        };
        this.locationHistory.add(routeInfo);
        this.handleChangeTab = this.handleChangeTab.bind(this);
        this.handleResetTab = this.handleResetTab.bind(this);
        this.handleNativeBack = this.handleNativeBack.bind(this);
        this.handleNavigate = this.handleNavigate.bind(this);
        this.handleNavigateBack = this.handleNavigateBack.bind(this);
        this.props.registerHistoryListener(this.handleHistoryChange.bind(this));
        this.handleSetCurrentTab = this.handleSetCurrentTab.bind(this);
        this.state = {
            routeInfo,
        };
    }
    handleChangeTab(tab, path, routeOptions) {
        const routeInfo = this.locationHistory.getCurrentRouteInfoForTab(tab);
        const [pathname, search] = path.split('?');
        if (routeInfo) {
            this.incomingRouteParams = Object.assign(Object.assign({}, routeInfo), { routeAction: 'push', routeDirection: 'none' });
            if (routeInfo.pathname === pathname) {
                this.incomingRouteParams.routeOptions = routeOptions;
                this.props.history.push(routeInfo.pathname + (routeInfo.search || ''));
            }
            else {
                this.incomingRouteParams.pathname = pathname;
                this.incomingRouteParams.search = search ? '?' + search : undefined;
                this.incomingRouteParams.routeOptions = routeOptions;
                this.props.history.push(pathname + (search ? '?' + search : ''));
            }
        }
        else {
            this.handleNavigate(pathname, 'push', 'none', undefined, routeOptions, tab);
        }
    }
    handleHistoryChange(location, action) {
        var _a, _b, _c;
        let leavingLocationInfo;
        if (this.incomingRouteParams) {
            if (this.incomingRouteParams.routeAction === 'replace') {
                leavingLocationInfo = this.locationHistory.previous();
            }
            else {
                leavingLocationInfo = this.locationHistory.current();
            }
        }
        else {
            leavingLocationInfo = this.locationHistory.current();
        }
        const leavingUrl = leavingLocationInfo.pathname + leavingLocationInfo.search;
        if (leavingUrl !== location.pathname) {
            if (!this.incomingRouteParams) {
                if (action === 'REPLACE') {
                    this.incomingRouteParams = {
                        routeAction: 'replace',
                        routeDirection: 'none',
                        tab: this.currentTab,
                    };
                }
                if (action === 'POP') {
                    const ri = this.locationHistory.current();
                    if (ri && ri.pushedByRoute) {
                        const prevInfo = this.locationHistory.findLastLocation(ri);
                        this.incomingRouteParams = Object.assign(Object.assign({}, prevInfo), { routeAction: 'pop', routeDirection: 'back' });
                    }
                    else {
                        const direction = 'none';
                        this.incomingRouteParams = {
                            routeAction: 'pop',
                            routeDirection: direction,
                            tab: this.currentTab,
                        };
                    }
                }
                if (!this.incomingRouteParams) {
                    this.incomingRouteParams = {
                        routeAction: 'push',
                        routeDirection: ((_a = location.state) === null || _a === void 0 ? void 0 : _a.direction) || 'forward',
                        routeOptions: (_b = location.state) === null || _b === void 0 ? void 0 : _b.routerOptions,
                        tab: this.currentTab,
                    };
                }
            }
            let routeInfo;
            if ((_c = this.incomingRouteParams) === null || _c === void 0 ? void 0 : _c.id) {
                routeInfo = Object.assign(Object.assign({}, this.incomingRouteParams), { lastPathname: leavingLocationInfo.pathname });
                this.locationHistory.add(routeInfo);
            }
            else {
                const isPushed = this.incomingRouteParams.routeAction === 'push' &&
                    this.incomingRouteParams.routeDirection === 'forward';
                routeInfo = Object.assign(Object.assign({ id: generateId('routeInfo') }, this.incomingRouteParams), { lastPathname: leavingLocationInfo.pathname, pathname: location.pathname, search: location.search, params: this.props.match.params, prevRouteLastPathname: leavingLocationInfo.lastPathname });
                if (isPushed) {
                    routeInfo.tab = leavingLocationInfo.tab;
                    routeInfo.pushedByRoute = leavingLocationInfo.pathname;
                }
                else if (routeInfo.routeAction === 'pop') {
                    const r = this.locationHistory.findLastLocation(routeInfo);
                    routeInfo.pushedByRoute = r === null || r === void 0 ? void 0 : r.pushedByRoute;
                }
                else if (routeInfo.routeAction === 'push' && routeInfo.tab !== leavingLocationInfo.tab) {
                    // If we are switching tabs grab the last route info for the tab and use its pushedByRoute
                    const lastRoute = this.locationHistory.getCurrentRouteInfoForTab(routeInfo.tab);
                    routeInfo.pushedByRoute = lastRoute === null || lastRoute === void 0 ? void 0 : lastRoute.pushedByRoute;
                }
                else if (routeInfo.routeAction === 'replace') {
                    // Make sure to set the lastPathname, etc.. to the current route so the page transitions out
                    const currentRouteInfo = this.locationHistory.current();
                    routeInfo.lastPathname = (currentRouteInfo === null || currentRouteInfo === void 0 ? void 0 : currentRouteInfo.pathname) || routeInfo.lastPathname;
                    routeInfo.prevRouteLastPathname = currentRouteInfo === null || currentRouteInfo === void 0 ? void 0 : currentRouteInfo.lastPathname;
                    routeInfo.pushedByRoute = (currentRouteInfo === null || currentRouteInfo === void 0 ? void 0 : currentRouteInfo.pushedByRoute) || routeInfo.pushedByRoute;
                    routeInfo.routeDirection = (currentRouteInfo === null || currentRouteInfo === void 0 ? void 0 : currentRouteInfo.routeDirection) || routeInfo.routeDirection;
                    routeInfo.routeAnimation = (currentRouteInfo === null || currentRouteInfo === void 0 ? void 0 : currentRouteInfo.routeAnimation) || routeInfo.routeAnimation;
                }
                this.locationHistory.add(routeInfo);
            }
            this.setState({
                routeInfo,
            });
        }
        this.incomingRouteParams = undefined;
    }
    handleNativeBack() {
        this.props.history.goBack();
    }
    handleNavigate(path, routeAction, routeDirection, routeAnimation, routeOptions, tab) {
        this.incomingRouteParams = Object.assign(this.incomingRouteParams || {}, {
            routeAction,
            routeDirection,
            routeOptions,
            routeAnimation,
            tab,
        });
        if (routeAction === 'push') {
            this.props.history.push(path);
        }
        else {
            this.props.history.replace(path);
        }
    }
    handleNavigateBack(defaultHref = '/', routeAnimation) {
        const config = getConfig();
        defaultHref = defaultHref ? defaultHref : config && config.get('backButtonDefaultHref');
        const routeInfo = this.locationHistory.current();
        if (routeInfo && routeInfo.pushedByRoute) {
            const prevInfo = this.locationHistory.findLastLocation(routeInfo);
            if (prevInfo) {
                this.incomingRouteParams = Object.assign(Object.assign({}, prevInfo), { routeAction: 'pop', routeDirection: 'back', routeAnimation: routeAnimation || routeInfo.routeAnimation });
                if (routeInfo.lastPathname === routeInfo.pushedByRoute) {
                    this.props.history.goBack();
                }
                else {
                    this.handleNavigate(prevInfo.pathname + (prevInfo.search || ''), 'pop', 'back');
                }
            }
            else {
                this.handleNavigate(defaultHref, 'pop', 'back');
            }
        }
        else {
            this.handleNavigate(defaultHref, 'pop', 'back');
        }
    }
    handleResetTab(tab, originalHref, originalRouteOptions) {
        const routeInfo = this.locationHistory.getFirstRouteInfoForTab(tab);
        if (routeInfo) {
            const newRouteInfo = Object.assign({}, routeInfo);
            newRouteInfo.pathname = originalHref;
            newRouteInfo.routeOptions = originalRouteOptions;
            this.incomingRouteParams = Object.assign(Object.assign({}, newRouteInfo), { routeAction: 'pop', routeDirection: 'back' });
            this.props.history.push(newRouteInfo.pathname + (newRouteInfo.search || ''));
        }
    }
    handleSetCurrentTab(tab) {
        this.currentTab = tab;
        const ri = Object.assign({}, this.locationHistory.current());
        if (ri.tab !== tab) {
            ri.tab = tab;
            this.locationHistory.update(ri);
        }
    }
    render() {
        return (React.createElement(RouteManagerContext.Provider, { value: this.routeMangerContextState },
            React.createElement(NavManager, { ionRoute: IonRouteInner, ionRedirect: {}, stackManager: StackManager, routeInfo: this.state.routeInfo, onNativeBack: this.handleNativeBack, onNavigateBack: this.handleNavigateBack, onNavigate: this.handleNavigate, onSetCurrentTab: this.handleSetCurrentTab, onChangeTab: this.handleChangeTab, onResetTab: this.handleResetTab, locationHistory: this.locationHistory }, this.props.children)));
    }
}
const IonRouter = withRouter(IonRouterInner);
IonRouter.displayName = 'IonRouter';

class IonReactRouter extends React.Component {
    constructor(props) {
        super(props);
        const { history } = props, rest = __rest(props, ["history"]);
        this.history = history || createBrowserHistory(rest);
        this.history.listen(this.handleHistoryChange.bind(this));
        this.registerHistoryListener = this.registerHistoryListener.bind(this);
    }
    handleHistoryChange(location, action) {
        if (this.historyListenHandler) {
            this.historyListenHandler(location, action);
        }
    }
    registerHistoryListener(cb) {
        this.historyListenHandler = cb;
    }
    render() {
        const _a = this.props, { children } = _a, props = __rest(_a, ["children"]);
        return (React.createElement(Router, Object.assign({ history: this.history }, props),
            React.createElement(IonRouter, { registerHistoryListener: this.registerHistoryListener }, children)));
    }
}

class IonReactMemoryRouter extends React.Component {
    constructor(props) {
        super(props);
        this.history = props.history;
        this.history.listen(this.handleHistoryChange.bind(this));
        this.registerHistoryListener = this.registerHistoryListener.bind(this);
    }
    handleHistoryChange(location, action) {
        if (this.historyListenHandler) {
            this.historyListenHandler(location, action);
        }
    }
    registerHistoryListener(cb) {
        this.historyListenHandler = cb;
    }
    render() {
        const _a = this.props, { children } = _a, props = __rest(_a, ["children"]);
        return (React.createElement(Router$1, Object.assign({}, props),
            React.createElement(IonRouter, { registerHistoryListener: this.registerHistoryListener }, children)));
    }
}

class IonReactHashRouter extends React.Component {
    constructor(props) {
        super(props);
        const { history } = props, rest = __rest(props, ["history"]);
        this.history = history || createHashHistory(rest);
        this.history.listen(this.handleHistoryChange.bind(this));
        this.registerHistoryListener = this.registerHistoryListener.bind(this);
    }
    handleHistoryChange(location, action) {
        if (this.historyListenHandler) {
            this.historyListenHandler(location, action);
        }
    }
    registerHistoryListener(cb) {
        this.historyListenHandler = cb;
    }
    render() {
        const _a = this.props, { children } = _a, props = __rest(_a, ["children"]);
        return (React.createElement(Router, Object.assign({ history: this.history }, props),
            React.createElement(IonRouter, { registerHistoryListener: this.registerHistoryListener }, children)));
    }
}

export { IonReactHashRouter, IonReactMemoryRouter, IonReactRouter };
//# sourceMappingURL=index.esm.js.map
