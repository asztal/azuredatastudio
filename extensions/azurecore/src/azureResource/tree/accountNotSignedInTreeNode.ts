/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import { AzureResourceTreeNode } from './baseTreeNodes';
import { treeLocalizationIdPrefix } from './constants';

export class AzureResourceAccountNotSignedInTreeNode extends AzureResourceTreeNode {
	public constructor(
	) {
		super(undefined);

		this.id = 'message_accountNotSignedIn';
		this.label = AzureResourceAccountNotSignedInTreeNode.signInLabel;
		this.isLeaf = true;
		this.nodePath = this.id;
		this.itemType = 'azure.resource.itemType.message';
		this.iconPath = undefined;
		this.callbacks = undefined;
		this.command = {
			title: AzureResourceAccountNotSignedInTreeNode.signInLabel,
			command: 'azure.resource.signin',
			arguments: [this]
		};
	}

	private static readonly signInLabel = localize(`${treeLocalizationIdPrefix}.accountNotSignedInTreeNode.signIn`, 'Sign in to Azure ...');
}
