/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { extensions } from 'vscode';
import { IAzureResourceProvider, AzureResourceNode, Account, AzureResourceSubscription } from 'sqlops';
import { AzureResourceServicePool } from './servicePool';

export class AzureResourceService {
	private constructor() {
	}

	public static getInstance(): AzureResourceService {
		return AzureResourceService._instance;
	}

	public async listResourceProviderIds(): Promise<string[]> {
		await this.ensureResourceProvidersRegistered();

		return Object.keys(this._resourceProviders);
	}

	public registerResourceProvider(resourceProvider: IAzureResourceProvider): void {
		this.doRegisterResourceProvider(resourceProvider);
	}

	public async getRootNode(resourceProviderId: string, account: Account, subscription: AzureResourceSubscription, credential: any): Promise<AzureResourceNode> {
		await this.ensureResourceProvidersRegistered();

		const resourceProvider = this._resourceProviders[resourceProviderId];
		if (resourceProvider) {
			return await resourceProvider.getRootNode(account, subscription, credential);
		} else {
			throw new Error(`Azure resource provider doesn't exist. Id: ${resourceProviderId}`);
		}
	}

	private async ensureResourceProvidersRegistered(): Promise<void> {
		if (this._areResourceProvidersLoaded) {
			return;
		}

		for (const extension of extensions.all) {
			await extension.activate();

			const contributes = extension.packageJSON && extension.packageJSON.contributes;
			if (!contributes) {
				continue;
			}

			if (contributes['azureResourceProvider']) {
				if (extension.exports && extension.exports.provideResources) {
					for (const resourceProvider of <IAzureResourceProvider[]>extension.exports.provideResources()) {
						this.doRegisterResourceProvider(resourceProvider);
						const commands = await resourceProvider.getCommands();
						for (const comamnd of commands) {
							this._servicePool.contextService.registerCommand(comamnd.id, comamnd.callback, comamnd.thisArg);
						}
					}
				}
			}
		}

		this._areResourceProvidersLoaded = true;
	}

	private doRegisterResourceProvider(resourceProvider: IAzureResourceProvider): void {
		this._resourceProviders[resourceProvider.providerId] = resourceProvider;
	}

	private _areResourceProvidersLoaded: boolean = false;
	private _resourceProviders: { [resourceProviderId: string]: IAzureResourceProvider } = {};
	private _servicePool = AzureResourceServicePool.getInstance();

	private static readonly _instance = new AzureResourceService();
}