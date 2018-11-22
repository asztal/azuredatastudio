/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import ControllerBase from './controllerBase';
import { DidChangeAccountsParams } from 'sqlops';

import { AzureResourceTreeProvider } from '../azureResource/tree/treeProvider';
import { registerAzureResourceCommands } from '../azureResource/commands';
import { AzureResourceServicePool } from '../azureResource/servicePool';
import { AzureResourceCredentialService } from '../azureResource/services/credentialService';
import { AzureResourceAccountService } from '../azureResource/services/accountService';
import { AzureResourceSubscriptionService } from '../azureResource/services/subscriptionService';
import { AzureResourceSubscriptionFilterService } from '../azureResource/services/subscriptionFilterService';
import { AzureResourceCacheService } from '../azureResource/services/cacheService';
import { AzureResourceContextService } from '../azureResource/services/contextService';
import { AzureResourceLogService } from '../azureResource/services/logService';

export default class AzureResourceController extends ControllerBase {
	public activate(): Promise<boolean> {
		const outputChannel = this.apiWrapper.createOutputChannel('Azure Resource');
		outputChannel.show(false);

		const cacheService = new AzureResourceCacheService(this.extensionContext);

		const servicePool = AzureResourceServicePool.getInstance();
		servicePool.logService = new AzureResourceLogService(outputChannel);
		servicePool.cacheService = cacheService;
		servicePool.contextService = new AzureResourceContextService(this.extensionContext, this.apiWrapper);
		servicePool.accountService = new AzureResourceAccountService(this.apiWrapper);
		servicePool.credentialService = new AzureResourceCredentialService(this.apiWrapper);
		servicePool.subscriptionService = new AzureResourceSubscriptionService();
		servicePool.subscriptionFilterService = new AzureResourceSubscriptionFilterService(cacheService);

		const azureResourceTree = new AzureResourceTreeProvider();
		this.extensionContext.subscriptions.push(this.apiWrapper.registerTreeDataProvider('azureResourceExplorer', azureResourceTree));

		servicePool.accountService.onDidChangeAccounts((e: DidChangeAccountsParams) => { azureResourceTree.notifyNodeChanged(undefined); });

		registerAzureResourceCommands(azureResourceTree);

		return Promise.resolve(true);
	}

	public deactivate(): void {
	}
}
