'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as constants from './constants';

import AzureResourceController from './controllers/azureResourceController';
import { AppContext } from './appContext';
import ControllerBase from './controllers/controllerBase';
import { ApiWrapper } from './apiWrapper';
import { AzureAccountProviderService } from './account-provider/azureAccountProviderService';

import { AzureResourceDatabaseProvider } from './azureResource/providers/database/databaseProvider';
import { AzureResourceDatabaseService } from './azureResource/providers/database/databaseService';
import { AzureResourceDatabaseServerProvider } from './azureResource/providers/databaseServer/databaseServerProvider';
import { AzureResourceDatabaseServerService } from './azureResource/providers/databaseServer/databaseServerService';
import { AzureResourceServicePool } from './azureResource/servicePool';

let controllers: ControllerBase[] = [];

// The function is a duplicate of \src\paths.js. IT would be better to import path.js but it doesn't
// work for now because the extension is running in different process.
export function getAppDataPath() {
	var platform = process.platform;
	switch (platform) {
		case 'win32': return process.env['APPDATA'] || path.join(process.env['USERPROFILE'], 'AppData', 'Roaming');
		case 'darwin': return path.join(os.homedir(), 'Library', 'Application Support');
		case 'linux': return process.env['XDG_CONFIG_HOME'] || path.join(os.homedir(), '.config');
		default: throw new Error('Platform not supported');
	}
}

export function getDefaultLogLocation() {
	return path.join(getAppDataPath(), 'azuredatastudio');
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(extensionContext: vscode.ExtensionContext) {
	let apiWrapper = new ApiWrapper();
	let appContext = new AppContext(extensionContext, apiWrapper);
	let activations: Thenable<boolean>[] = [];

	// Create the folder for storing the token caches
	let storagePath = path.join(getDefaultLogLocation(), constants.extensionName);
	try {
		if (!fs.existsSync(storagePath)) {
			fs.mkdirSync(storagePath);
			console.log('Initialized Azure account extension storage.');
		}
	} catch (e) {
		console.error(`Initialization of Azure account extension storage failed: ${e}`);
		console.error('Azure accounts will not be available');
		return;
	}

	// Create the provider service and activate
	const accountProviderService = new AzureAccountProviderService(extensionContext, storagePath);
	extensionContext.subscriptions.push(accountProviderService);
	accountProviderService.activate();

	// Start the azure resource controller
	let azureResourceController = new AzureResourceController(appContext);
	controllers.push(azureResourceController);
	extensionContext.subscriptions.push(azureResourceController);
	activations.push(azureResourceController.activate());

	return {
		provideResources() {
			const servicePool: AzureResourceServicePool = AzureResourceServicePool.getInstance();

			return [
				new AzureResourceDatabaseProvider(new AzureResourceDatabaseService(), servicePool.contextService),
		        new AzureResourceDatabaseServerProvider(new AzureResourceDatabaseServerService(), servicePool.contextService)
			];
		}
	};
}

// this method is called when your extension is deactivated
export function deactivate() {
	for (let controller of controllers) {
		controller.deactivate();
	}
}
