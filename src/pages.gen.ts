// deno-fmt-ignore-file
// biome-ignore format: generated types do not need formatting
// prettier-ignore
import type { PathsForPages, GetConfigResponse } from 'waku/router';

// prettier-ignore
import type { getConfig as File_DashboardAccountsId_getConfig } from './pages/dashboard/accounts/[id]';
// prettier-ignore
import type { getConfig as File_DashboardAccountsIndex_getConfig } from './pages/dashboard/accounts/index';
// prettier-ignore
import type { getConfig as File_DashboardAccountsNew_getConfig } from './pages/dashboard/accounts/new';
// prettier-ignore
import type { getConfig as File_DashboardCardsIndex_getConfig } from './pages/dashboard/cards/index';
// prettier-ignore
import type { getConfig as File_DashboardIndex_getConfig } from './pages/dashboard/index';
// prettier-ignore
import type { getConfig as File_DashboardScheduledIdEdit_getConfig } from './pages/dashboard/scheduled/[id]/edit';
// prettier-ignore
import type { getConfig as File_DashboardScheduledId_getConfig } from './pages/dashboard/scheduled/[id]';
// prettier-ignore
import type { getConfig as File_DashboardScheduledCalendar_getConfig } from './pages/dashboard/scheduled/calendar';
// prettier-ignore
import type { getConfig as File_DashboardScheduledCreate_getConfig } from './pages/dashboard/scheduled/create';
// prettier-ignore
import type { getConfig as File_DashboardScheduledIndex_getConfig } from './pages/dashboard/scheduled/index';
// prettier-ignore
import type { getConfig as File_DashboardSettingsIndex_getConfig } from './pages/dashboard/settings/index';
// prettier-ignore
import type { getConfig as File_DashboardSettingsNotifications_getConfig } from './pages/dashboard/settings/notifications';
// prettier-ignore
import type { getConfig as File_DashboardTransactionsIndex_getConfig } from './pages/dashboard/transactions/index';
// prettier-ignore
import type { getConfig as File_Index_getConfig } from './pages/index';
// prettier-ignore
import type { getConfig as File_Login_getConfig } from './pages/login';

// prettier-ignore
type Page =
| ({ path: '/dashboard/accounts/[id]' } & GetConfigResponse<typeof File_DashboardAccountsId_getConfig>)
| ({ path: '/dashboard/accounts' } & GetConfigResponse<typeof File_DashboardAccountsIndex_getConfig>)
| ({ path: '/dashboard/accounts/new' } & GetConfigResponse<typeof File_DashboardAccountsNew_getConfig>)
| ({ path: '/dashboard/cards' } & GetConfigResponse<typeof File_DashboardCardsIndex_getConfig>)
| ({ path: '/dashboard' } & GetConfigResponse<typeof File_DashboardIndex_getConfig>)
| ({ path: '/dashboard/scheduled/[id]/edit' } & GetConfigResponse<typeof File_DashboardScheduledIdEdit_getConfig>)
| ({ path: '/dashboard/scheduled/[id]' } & GetConfigResponse<typeof File_DashboardScheduledId_getConfig>)
| ({ path: '/dashboard/scheduled/calendar' } & GetConfigResponse<typeof File_DashboardScheduledCalendar_getConfig>)
| ({ path: '/dashboard/scheduled/create' } & GetConfigResponse<typeof File_DashboardScheduledCreate_getConfig>)
| ({ path: '/dashboard/scheduled' } & GetConfigResponse<typeof File_DashboardScheduledIndex_getConfig>)
| ({ path: '/dashboard/settings' } & GetConfigResponse<typeof File_DashboardSettingsIndex_getConfig>)
| ({ path: '/dashboard/settings/notifications' } & GetConfigResponse<typeof File_DashboardSettingsNotifications_getConfig>)
| ({ path: '/dashboard/transactions' } & GetConfigResponse<typeof File_DashboardTransactionsIndex_getConfig>)
| ({ path: '/' } & GetConfigResponse<typeof File_Index_getConfig>)
| ({ path: '/login' } & GetConfigResponse<typeof File_Login_getConfig>);

// prettier-ignore
declare module 'waku/router' {
  interface RouteConfig {
    paths: PathsForPages<Page>;
  }
  interface CreatePagesConfig {
    pages: Page;
  }
}
