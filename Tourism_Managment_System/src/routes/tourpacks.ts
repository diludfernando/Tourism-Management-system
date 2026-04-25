export const TOURPACKS_LIST = '/my-tourpacks/index' as const;
export const tourpacksRoute = TOURPACKS_LIST;
export const tourpackDetailRoute = (id: string) => ({ pathname: '/my-tourpacks/[id]' as const, params: { id } } as const);