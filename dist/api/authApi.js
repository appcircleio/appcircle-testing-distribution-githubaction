"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = void 0;
const axios_1 = __importDefault(require("axios"));
const AUTH_HOSTNAME = 'https://auth.appcircle.io';
async function getToken(pat) {
    const params = new URLSearchParams();
    params.append('pat', pat);
    const response = await axios_1.default.post(`${AUTH_HOSTNAME}/auth/v1/token`, params.toString(), {
        headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded'
        }
    });
    return response.data;
}
exports.getToken = getToken;
//# sourceMappingURL=authApi.js.map