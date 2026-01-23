/**
 * Services Index
 * ==============
 * Central export for all service modules
 */

export {
    deviceUserService, getRemoteUser,
    isPhoneAvailable, syncUserToServer, type DeviceUser,
    type UpsertUserResult
} from './deviceUserService';

