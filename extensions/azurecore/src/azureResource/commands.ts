/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { window, QuickPickItem } from 'vscode';
import { AzureResourceSubscription } from 'sqlops';

import { AzureResourceTreeNode } from './tree/baseTreeNodes';
import { AzureResourceTreeProvider } from './tree/treeProvider';
import { AzureResourceAccountTreeNode } from './tree/accountTreeNode';
import { AzureResourceServicePool } from './servicePool';

export function registerAzureResourceCommands(tree: AzureResourceTreeProvider): void {
	const servicePool = AzureResourceServicePool.getInstance();

	servicePool.contextService.registerCommand('azure.resource.selectsubscriptions', async (node?: AzureResourceTreeNode) => {
		if (!(node instanceof AzureResourceAccountTreeNode)) {
			return;
		}

		const accountNode = node as AzureResourceAccountTreeNode;

		let subscriptions = await accountNode.getCachedSubscriptions();
		if (!subscriptions || subscriptions.length === 0) {
			const credentials = await servicePool.credentialService.getCredentials(accountNode.account);
			subscriptions = await servicePool.subscriptionService.getSubscriptions(accountNode.account, credentials);
		}

		const selectedSubscriptions = (await servicePool.subscriptionFilterService.getSelectedSubscriptions(accountNode.account)) || <AzureResourceSubscription[]>[];
		const selectedSubscriptionIds: string[] = [];
		if (selectedSubscriptions.length > 0) {
			selectedSubscriptionIds.push(...selectedSubscriptions.map((subscription) => subscription.id));
		} else {
			// ALL subscriptions are selected by default
			selectedSubscriptionIds.push(...subscriptions.map((subscription) => subscription.id));
		}

		interface SubscriptionQuickPickItem extends QuickPickItem {
			subscription: AzureResourceSubscription;
		}

		const subscriptionItems: SubscriptionQuickPickItem[] = subscriptions.map((subscription) => {
			return {
				label: subscription.name,
				picked: selectedSubscriptionIds.indexOf(subscription.id) !== -1,
				subscription: subscription
			};
		});

		const pickedSubscriptionItems = (await window.showQuickPick(subscriptionItems, { canPickMany: true }));
		if (pickedSubscriptionItems && pickedSubscriptionItems.length > 0) {
			tree.refresh(node, false);

			const pickedSubscriptions = pickedSubscriptionItems.map((subscriptionItem) => subscriptionItem.subscription);
			await servicePool.subscriptionFilterService.saveSelectedSubscriptions(accountNode.account, pickedSubscriptions);
		}
	});

	servicePool.contextService.registerCommand('azure.resource.refreshall', () => tree.notifyNodeChanged(undefined));

	servicePool.contextService.registerCommand('azure.resource.refresh', async (node?: AzureResourceTreeNode) => {
		tree.refresh(node, true);
	});

	servicePool.contextService.registerCommand('azure.resource.signin', async (node?: AzureResourceTreeNode) => {
		servicePool.contextService.executeCommand('sql.action.accounts.manageLinkedAccount');
	});
}
