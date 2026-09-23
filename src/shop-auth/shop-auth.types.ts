export type ShopJwtPayload = {
  sub: string;
  sessionId: string;
  ownerId: string;
  type: 'access' | 'refresh';
};

export type AuthenticatedShop = {
  id: string;
  shopId: string;
  login: string;
  ownerId: string;
  sessionId: string;
};
