/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { TreeDataProvider, EventEmitter, Event, TreeItem } from 'vscode';
import { setInterval, clearInterval } from 'timers';
import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import { AzureResourceServicePool } from '../servicePool';
import { AzureResourceAccountTreeNode } from './accountTreeNode';
import { AzureResourceAccountNotSignedInTreeNode } from './accountNotSignedInTreeNode';
import { AzureResourceMessageTreeNode } from './messageTreeNode';
import { AzureResourceContainerTreeNode, AzureResourceTreeNode } from './baseTreeNodes';
import { AzureResourceErrorMessageUtil } from '../utils';
import { IAzureResourceTreeChangeHandler } from './treeChangeHandler';
import { treeLocalizationIdPrefix } from './constants';

export class AzureResourceTreeProvider implements TreeDataProvider<AzureResourceTreeNode>, IAzureResourceTreeChangeHandler {
	public async getChildren(element?: AzureResourceTreeNode): Promise<AzureResourceTreeNode[]> {
		if (element) {
			return element.getChildren();
		}

		if (!this.isSystemInitialized) {
			this._loadingTimer = setInterval(async () => {
				try {
					// Call sqlops.accounts.getAllAccounts() to determine whether the system has been initialized.
					await AzureResourceServicePool.getInstance().accountService.getAccounts();

					// System has been initialized
					this.isSystemInitialized = true;

					if (this._loadingTimer) {
						clearInterval(this._loadingTimer);
					}

					this._onDidChangeTreeData.fire(undefined);
				} catch (error) {
					// System not initialized yet
					this.isSystemInitialized = false;
				}
			}, AzureResourceTreeProvider.LoadingTimerInterval);

			return [AzureResourceMessageTreeNode.create(AzureResourceTreeProvider.Loading, undefined)];
		}

		try {
			const accounts = await AzureResourceServicePool.getInstance().accountService.getAccounts();

			if (accounts && accounts.length > 0) {
				return accounts.map((account) => new AzureResourceAccountTreeNode(account, undefined, this));
			} else {
				return [new AzureResourceAccountNotSignedInTreeNode()];
			}
		} catch (error) {
			return [AzureResourceMessageTreeNode.create(AzureResourceErrorMessageUtil.getErrorMessage(error), undefined)];
		}
	}

	public get onDidChangeTreeData(): Event<AzureResourceTreeNode> {
		return this._onDidChangeTreeData.event;
	}

	public notifyNodeChanged(node: AzureResourceTreeNode): void {
		this._onDidChangeTreeData.fire(node);
	}

	public async refresh(node: AzureResourceTreeNode, isClearingCache: boolean): Promise<void> {
		if (isClearingCache) {
			if ((node instanceof AzureResourceContainerTreeNode)) {
				node.clearCache();
			}
		}

		this._onDidChangeTreeData.fire(node);
	}

	public getTreeItem(element: AzureResourceTreeNode): TreeItem | Thenable<TreeItem> {
		return element.getTreeItem();
	}

	public isSystemInitialized: boolean = false;

	private _loadingTimer: NodeJS.Timer = undefined;
	private _onDidChangeTreeData = new EventEmitter<AzureResourceTreeNode>();

	private static readonly Loading = localize(`${treeLocalizationIdPrefix}.treeProvider.loading`, 'Loading ...');
	private static readonly LoadingTimerInterval = 5000;
}
