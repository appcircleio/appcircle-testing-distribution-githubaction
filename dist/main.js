"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const core = __importStar(require("@actions/core"));
const child_process_1 = require("child_process");
const authApi_1 = require("./api/authApi");
function runCLICommand(command) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                console.error(error);
            }
            else {
                resolve(stdout);
            }
        });
    });
}
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
    try {
        await runCLICommand(`npm install -g @appcircle/cli`);
        const accessToken = core.getInput('accessToken');
        const profileID = core.getInput('profileID');
        const appPath = core.getInput('appPath');
        const message = core.getInput('message');
        const loginResponse = await (0, authApi_1.getToken)(accessToken);
        console.log(loginResponse);
        // const response = await runCLICommand(
        //   `appcircle testing-distribution upload --app=${appPath} --distProfileId=${profileID} --message "${message}" -o json`
        // )
        // const taskId = JSON.parse(response)?.taskId
        // if (!taskId) {
        //   core.setFailed('Task ID is not found in the upload response')
        // } else {
        //   await checkTaskStatus(JSON.parse(response).taskId)
        //   console.log(`${appPath} uploaded to Appcircle successfully`)
        // }
    }
    catch (error) {
        // Fail the workflow run if an error occurs
        if (error instanceof Error)
            core.setFailed(error.message);
    }
}
exports.run = run;
async function checkTaskStatus(taskId, currentAttempt = 0) {
    const tokenCommand = `appcircle config get AC_ACCESS_TOKEN -o json`;
    const output = (0, child_process_1.execSync)(tokenCommand, { encoding: 'utf-8' });
    const apiAccessToken = JSON.parse(output)?.AC_ACCESS_TOKEN;
    const response = await fetch(`https://api.appcircle.io/task/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiAccessToken}`
        }
    });
    const res = await response.json();
    if ((res?.stateValue == 0 || res?.stateValue == 1) && currentAttempt < 100) {
        return checkTaskStatus(taskId, currentAttempt + 1);
    }
    else if (res?.stateValue === 2) {
        throw new Error(`Build Upload Task Failed: ${res.stateName}`);
    }
}
//# sourceMappingURL=main.js.map