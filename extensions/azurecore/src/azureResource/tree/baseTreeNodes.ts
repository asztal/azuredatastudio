/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as sqlops from 'sqlops';
import * as vscode from 'vscode';

import { ServiceClientCredentials } from 'ms-rest';

import { AzureResourceCredentialError } from '../errors';
import { AzureResourceServicePool } from '../servicePool';

type AzureResourceTreeNodePredicate = (node: AzureResourceTreeNode) => boolean;

export class AzureResourceTreeNode {
	public constructor(
		public parent: AzureResourceTreeNode
	) {
	}

	public generateNodePath(): string {
		let path = undefined;
		if (this.parent) {
			path = this.parent.generateNodePath();
		}
		path = path ? `${path}/${this.nodePath}` : this.nodePath;
		return path;
	}

	public findNodeByPath(path: string, expandIfNeeded: boolean = false): Promise<AzureResourceTreeNode> {
		let condition: AzureResourceTreeNodePredicate = (node: AzureResourceTreeNode) => node.getNodeInfo().nodePath === path;
		let filter: AzureResourceTreeNodePredicate = (node: AzureResourceTreeNode) => path.startsWith(node.getNodeInfo().nodePath);
		return AzureResourceTreeNode.findNode(this, condition, filter, true);
	}

	public static async findNode(node: AzureResourceTreeNode, condition: AzureResourceTreeNodePredicate, filter: AzureResourceTreeNodePredicate, expandIfNeeded: boolean): Promise<AzureResourceTreeNode> {
		if (!node) {
			return undefined;
		}

		if (condition(node)) {
			return node;
		}

		let nodeInfo = node.getNodeInfo();
		if (nodeInfo.isLeaf) {
			return undefined;
		}

		// TODO support filtering by already expanded / not yet expanded
		let children = await node.getChildren();
		if (children) {
			for (let child of children) {
				if (filter && filter(child)) {
					let childNode =  await this.findNode(child, condition, filter, expandIfNeeded);
					if (childNode) {
						return childNode;
					}
				}
			}
		}
		return undefined;
	}

	public async getChildren(): Promise<AzureResourceTreeNode[]> {
		if (!this.callbacks) {
			return <AzureResourceTreeNode[]>[];
		} else {
			const children = await this.callbacks.getChildren();

			return children.map((child) => AzureResourceTreeNode.fromNodeInfo(child, this));
		}
	}

	public getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem> {
		const item = new vscode.TreeItem(this.label, this.isLeaf ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
		item.contextValue = this.itemType;
		item.iconPath = this.iconPath;
		return item;
	}

	public getNodeInfo(): sqlops.AzureResourceNode {
		return {
			id: this.id,
			label: this.label,
			nodePath: this.generateNodePath(),
			isLeaf: this.isLeaf,
			itemType: this.itemType,
			itemValue: this.itemValue,
			iconPath: this.iconPath,
			callbacks: this.callbacks
		};
	}

	public static fromNodeInfo(nodeInfo: sqlops.AzureResourceNode, parent: AzureResourceTreeNode) {
		const node = new AzureResourceTreeNode(parent);

		node.id = nodeInfo.id;
		node.label = nodeInfo.label;
		node.isLeaf = nodeInfo.isLeaf;
		node.nodePath = nodeInfo.nodePath;
		node.itemType = nodeInfo.itemType;
		node.itemValue = nodeInfo.itemValue;
		node.iconPath = nodeInfo.iconPath;
		node.callbacks = nodeInfo.callbacks;

		return node;
	}

	public id: string = undefined;
	public label: string = undefined;
	public isLeaf: boolean = false;
	public nodePath: string = undefined;
	public itemType: string = undefined;
	public itemValue: any = undefined;
	public iconPath: { light: string | vscode.Uri; dark: string | vscode.Uri } = undefined;
	public callbacks?: sqlops.AzureResourceNodeCallbacks = undefined;
	public command?: vscode.Command = undefined;

	public readonly servicePool = AzureResourceServicePool.getInstance();
}

export class AzureResourceContainerTreeNode extends AzureResourceTreeNode {
	public constructor(
		public readonly account: sqlops.Account,
		parent: AzureResourceTreeNode
	) {
		super(parent);
	}

	public clearCache(): void {
		this._isClearingCache = true;
	}

	public get isClearingCache(): boolean {
		return this._isClearingCache;
	}

	protected async getCredentials(): Promise<ServiceClientCredentials[]> {
		try {
			return await this.servicePool.credentialService.getCredentials(this.account);
		} catch (error) {
			if (error instanceof AzureResourceCredentialError) {
				this.servicePool.contextService.showErrorMessage(error.message);

				this.servicePool.contextService.executeCommand('azure.resource.signin');
			} else {
				throw error;
			}
		}
	}

	protected setCacheKey(id: string): void {
        this._cacheKey = this.servicePool.cacheService.generateKey(id);
    }

	protected updateCache<T>(cache: T): void {
		this.servicePool.cacheService.update<T>(this._cacheKey, cache);
	}

	protected getCache<T>(): T {
		return this.servicePool.cacheService.get<T>(this._cacheKey);
	}

	protected _isClearingCache = true;
	private _cacheKey: string = undefined;
}