export const ADMIN_TOURPACKS_LIST = '/admin/my-tourpacks/index' as const;
export const adminTourpacksRoute = ADMIN_TOURPACKS_LIST;
export const adminTourpacksCreateRoute = { pathname: '/admin/my-tourpacks/create' as const };

export const adminTourpackDetailRoute = (id: string) => ({ pathname: '/admin/my-tourpacks/[id]' as const, params: { id } } as const);
export const adminTourpacksEditRoute = (id: string) => ({ pathname: '/admin/my-tourpacks/edit' as const, params: { id } } as const);