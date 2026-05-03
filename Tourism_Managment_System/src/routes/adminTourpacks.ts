export const ADMIN_TOUR_PACKS_LIST_ROUTE = '/admin/my-tourpacks' as const;
export const adminTourPacksListRoute = ADMIN_TOUR_PACKS_LIST_ROUTE;
export const adminTourPacksCreateRoute = { pathname: '/admin/my-tourpacks/create' as const };
export const adminTourPackDetailRoute = (tourPackId: string) => ({ pathname: '/admin/my-tourpacks/[adminTourPackageId]' as const, params: { adminTourPackageId: tourPackId } } as const);
export const adminTourPacksEditRoute = (tourPackId: string) => ({ pathname: '/admin/my-tourpacks/edit' as const, params: { id: tourPackId } } as const);

// Backward-compatible aliases
export const ADMIN_TOURPACKS_LIST = ADMIN_TOUR_PACKS_LIST_ROUTE;
export const adminTourpacksRoute = adminTourPacksListRoute;
export const adminTourpacksCreateRoute = adminTourPacksCreateRoute;
export const adminTourpackDetailRoute = adminTourPackDetailRoute;
export const adminTourpacksEditRoute = adminTourPacksEditRoute;