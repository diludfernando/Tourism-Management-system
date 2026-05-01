export const TOUR_PACKS_LIST_ROUTE = '/my-tourpacks' as const;
export const tourPacksListRoute = TOUR_PACKS_LIST_ROUTE;
export const tourPackDetailRoute = (tourPackId: string) => ({ pathname: '/my-tourpacks/[tourPackageId]' as const, params: { tourPackageId: tourPackId } } as const);

// Backward-compatible aliases
export const TOURPACKS_LIST = TOUR_PACKS_LIST_ROUTE;
export const tourpacksRoute = tourPacksListRoute;
export const tourpackDetailRoute = tourPackDetailRoute;