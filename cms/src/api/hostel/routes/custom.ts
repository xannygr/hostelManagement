/**
 * hostel custom routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/metrics/hostels',
      handler: 'hostel.stats',
      config: {
        auth: {
          scope: ['api::hostel.hostel.find'],
        },
      },
    },
  ],
};
