export const getDocumentZoom = (): number => {
    const rawZoom = getComputedStyle(document.documentElement).zoom || '1';
    const zoom = Number.parseFloat(rawZoom);
    return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
};

export const viewportPxToCssPx = (value: number, zoom = getDocumentZoom()): number => {
    return value / zoom;
};

export const getViewportCssWidth = (zoom = getDocumentZoom()): number => {
    return viewportPxToCssPx(window.innerWidth, zoom);
};

export const getViewportCssHeight = (zoom = getDocumentZoom()): number => {
    return viewportPxToCssPx(window.innerHeight, zoom);
};