/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { AzureResourceTreeNode } from './baseTreeNodes';

export class AzureResourceMessageTreeNode extends AzureResourceTreeNode {
	public constructor(
		public readonly message: string,
		parent: AzureResourceTreeNode
	) {
		super(undefined);

		this.id = `message_${AzureResourceMessageTreeNode._messageNum++}`;
		this.label = this.message;
		this.isLeaf = true;
		this.nodePath = this.id;
		this.itemType = 'azure.resource.itemType.message';
		this.iconPath = undefined;
		this.callbacks = undefined;
		this.parent = undefined;

		this.parent = parent;
	}

	public static create(message: string, parent: AzureResourceTreeNode): AzureResourceMessageTreeNode {
		return new AzureResourceMessageTreeNode(message, parent);
	}

	private static _messageNum: number = 0;
}
