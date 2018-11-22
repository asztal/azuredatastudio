/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { IAzureResourceProvider, AzureResourceNode, Account, IConnectionProfile, AzureResourceSubscription, AzureResourceCommand } from 'sqlops';

import { IAzureResourceDatabaseServerService } from './interfaces';
import { AzureResourceDatabaseServer } from './models';
import { IAzureResourceContextService } from '../../interfaces';
import { generateGuid } from '../../utils';

export class AzureResourceDatabaseServerProvider implements IAzureResourceProvider {
	public constructor(
		public databaseServerService: IAzureResourceDatabaseServerService,
		public contextService: IAzureResourceContextService
	) {
	}

	public async getCommands(): Promise<AzureResourceCommand[]> {
		const commands: AzureResourceCommand[] = [];

		commands.push({
			id: 'azure.resource.connectsqlserver',
			callback: async (node?: any) => {
				if (!node.itemType || node.itemType !== AzureResourceDatabaseServerProvider.databaseServerItemType || !node.itemValue) {
					return;
				}

				const databaseServer = node.itemValue;

				let connectionProfile: IConnectionProfile = {
					id: generateGuid(),
					connectionName: `connection to '${databaseServer.defaultDatabaseName}' on '${databaseServer.fullName}'`,
					serverName: databaseServer.fullName,
					databaseName: databaseServer.defaultDatabaseName,
					userName: databaseServer.loginName,
					password: '',
					authenticationType: 'SqlLogin',
					savePassword: true,
					groupFullName: '',
					groupId: '',
					providerName: 'MSSQL',
					saveProfile: true,
					options: {
					}
				};

				const conn = await this.contextService.openConnectionDialog(undefined, connectionProfile, { saveConnection: true, showDashboard: true });
				if (conn) {
					this.contextService.executeCommand('workbench.view.connections');
				}
			}
		});

		return commands;
	}

	public async getRootNode(account: Account, subscription: AzureResourceSubscription, credential: any): Promise<AzureResourceNode> {
		return {
			id: 'databaseServerContainer',
			label: 'SQL Database Servers',
			nodePath: 'databaseServerContainer',
			isLeaf: false,
			itemType: 'azure.resource.itemType.databaseServerContainer',
			itemValue: undefined,
			iconPath: {
				dark: this.contextService.getAbsolutePath('resources/dark/folder_inverse.svg'),
				light: this.contextService.getAbsolutePath('resources/light/folder.svg'),
			},
			callbacks: {
				getChildren: () => this.getChildren(account, subscription, credential)
			}
		};
	}

	public async getChildren(account: Account, subscription: AzureResourceSubscription, credential: any): Promise<AzureResourceNode[]> {
		const databaseServers: AzureResourceDatabaseServer[] = (await this.databaseServerService.getDatabaseServers(subscription, credential)) || <AzureResourceDatabaseServer[]>[];

		return databaseServers.map((databaseServer) => <AzureResourceNode>{
			id: databaseServer.name,
			label: databaseServer.name,
			nodePath: `databaseServer_${databaseServer.name}`,
			isLeaf: true,
			itemType: AzureResourceDatabaseServerProvider.databaseServerItemType,
			itemValue: databaseServer,
			iconPath: {
				dark: this.contextService.getAbsolutePath('resources/dark/sql_server_inverse.svg'),
				light: this.contextService.getAbsolutePath('resources/light/sql_server.svg'),
			}
		});
	}

	public get providerId(): string {
		return 'azure.resource.providers.databaseServer';
	}

	private static readonly databaseServerItemType = 'azure.resource.itemType.databaseServer';
}