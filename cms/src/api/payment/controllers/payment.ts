/**
 * payment controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::payment.payment', () => ({
  async create(ctx) {
    const data = ctx.request.body?.data as { guest?: unknown } | undefined;
    const guest = data?.guest as { connect?: unknown[] } | undefined;
    const hasGuest = guest != null && Array.isArray(guest.connect) && guest.connect.length > 0;
    if (!hasGuest) {
      return ctx.badRequest('Платёж должен быть привязан к гостю');
    }
    return super.create(ctx);
  },
}));
