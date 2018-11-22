/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { Account, AzureResourceNode, AzureResourceSubscription } from 'sqlops';
import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import { AzureResourceTreeNode, AzureResourceContainerTreeNode } from './baseTreeNodes';
import { treeLocalizationIdPrefix } from './constants';
import { AzureResourceMessageTreeNode } from './messageTreeNode';
import { AzureResourceErrorMessageUtil } from '../utils';
import { AzureResourceService } from '../resourceService';

export class AzureResourceSubscriptionTreeNode extends AzureResourceContainerTreeNode {
	public constructor(
		account: Account,
		public readonly subscription: AzureResourceSubscription,
		parent: AzureResourceTreeNode
	) {
		super(account, parent);

		this.id = `subscription_${this.subscription.id}`;
		this.label = this.subscription.name;
		this.isLeaf = false;
		this.nodePath = this.id;
		this.itemType = 'azure.resource.itemType.subscription';
		this.itemValue = subscription;
		this.iconPath = {
			dark: this.servicePool.contextService.getAbsolutePath('resources/dark/subscription_inverse.svg'),
			light: this.servicePool.contextService.getAbsolutePath('resources/light/subscription.svg')
		};

		this.setCacheKey(`account_${account.key.accountId}.subscription_${this.subscription.id}.resources`);
	}

	public async getChildren(): Promise<AzureResourceTreeNode[]> {
		try {
			const azureResourceService = AzureResourceService.getInstance();

			const children: AzureResourceNode[] = [];

			const credential = await this.servicePool.credentialService.getCredential(this.account, this.subscription.tenantId);
			for (const resourceProviderId of await azureResourceService.listResourceProviderIds()) {
				children.push(await azureResourceService.getRootNode(resourceProviderId, this.account, this.subscription, credential));
			}

			if (children.length === 0) {
				return ([AzureResourceMessageTreeNode.create(AzureResourceSubscriptionTreeNode.noResources, this)]);
			} else {
				return children.map((child) => AzureResourceTreeNode.fromNodeInfo(child, this));
			}
		} catch (error) {
			return [AzureResourceMessageTreeNode.create(AzureResourceErrorMessageUtil.getErrorMessage(error), this)];
		}
	}

	private static readonly noResources = localize(`${treeLocalizationIdPrefix}.subscriptionTreeNode.noResources`, 'No Resources found.');
}
