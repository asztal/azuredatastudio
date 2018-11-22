/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Account, AzureResourceSubscription } from 'sqlops';
import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import { AzureResourceTreeNode, AzureResourceContainerTreeNode } from './baseTreeNodes';
import { AzureResourceSubscriptionTreeNode } from './subscriptionTreeNode';
import { AzureResourceMessageTreeNode } from './messageTreeNode';
import { AzureResourceErrorMessageUtil } from '../utils';
import { treeLocalizationIdPrefix } from './constants';
import { IAzureResourceTreeChangeHandler } from './treeChangeHandler';

export class AzureResourceAccountTreeNode extends AzureResourceContainerTreeNode {
	public constructor(
		account: Account,
		parent: AzureResourceTreeNode,
		public treeChangeHandler: IAzureResourceTreeChangeHandler
	) {
		super(account, parent);

		this.id = `account_${this.account.key.accountId}`;
		this.label = this.generateLabel();
		this.isLeaf = false;
		this.nodePath = this.id;
		this.itemType = 'azure.resource.itemType.account';
		this.iconPath = {
			dark: this.servicePool.contextService.getAbsolutePath('resources/dark/account_inverse.svg'),
			light: this.servicePool.contextService.getAbsolutePath('resources/light/account.svg')
		};
		this.parent = undefined;

		this.setCacheKey(`${this.id}.subscriptions`);
	}

	public async getChildren(): Promise<AzureResourceTreeNode[]> {
		try {
			let subscriptions: AzureResourceSubscription[] = [];

			if (this._isClearingCache) {
				const credentials = await this.getCredentials();
				subscriptions = (await this.servicePool.subscriptionService.getSubscriptions(this.account, credentials)) || <AzureResourceSubscription[]>[];

				this.updateCache<AzureResourceSubscription[]>(subscriptions);

				this._isClearingCache = false;
			} else {
				subscriptions = await this.getCachedSubscriptions();
			}

			this._totalSubscriptionCount = subscriptions.length;

			let selectedSubscriptions = await this.servicePool.subscriptionFilterService.getSelectedSubscriptions(this.account);
			let selectedSubscriptionIds = (selectedSubscriptions || <AzureResourceSubscription[]>[]).map((subscription) => subscription.id);
			if (selectedSubscriptionIds.length > 0) {
				subscriptions = subscriptions.filter((subscription) => selectedSubscriptionIds.indexOf(subscription.id) !== -1);
				this._selectedSubscriptionCount = selectedSubscriptionIds.length;
			} else {
				// ALL subscriptions are listed by default
				this._selectedSubscriptionCount = this._totalSubscriptionCount;
			}

			this.refreshLabel();

			if (subscriptions.length === 0) {
				return [AzureResourceMessageTreeNode.create(AzureResourceAccountTreeNode.noSubscriptions, this)];
			} else {
				return subscriptions.map((subscription) => new AzureResourceSubscriptionTreeNode(this.account, subscription, this));
			}
		} catch (error) {
			return [AzureResourceMessageTreeNode.create(AzureResourceErrorMessageUtil.getErrorMessage(error), this)];
		}
	}

	public async getCachedSubscriptions(): Promise<AzureResourceSubscription[]> {
		return this.getCache<AzureResourceSubscription[]>();
	}

	public get totalSubscriptionCount(): number {
		return this._totalSubscriptionCount;
	}

	public get selectedSubscriptionCount(): number {
		return this._selectedSubscriptionCount;
	}

	public getTreeItem(): TreeItem | Promise<TreeItem> {
		const item = new TreeItem(this.label, this.isLeaf ? TreeItemCollapsibleState.None : TreeItemCollapsibleState.Collapsed);
		item.id = this.id;
		item.contextValue = this.itemType;
		item.iconPath = this.iconPath;
		return item;
	}

	protected refreshLabel(): void {
		const newLabel = this.generateLabel();
		if (this.label !== newLabel) {
			this.label = newLabel;
			this.treeChangeHandler.notifyNodeChanged(this);
		}
	}

	private generateLabel(): string {
		let label = `${this.account.displayInfo.displayName} (${this.account.key.accountId})`;

		if (this._totalSubscriptionCount !== 0) {
			label += ` (${this._selectedSubscriptionCount} / ${this._totalSubscriptionCount} subscriptions)`;
		}

		return label;
	}

	private _totalSubscriptionCount = 0;
	private _selectedSubscriptionCount = 0;

	private static readonly noSubscriptions = localize(`${treeLocalizationIdPrefix}.accountTreeNode.noSubscriptions`, 'No Subscriptions found.');
}