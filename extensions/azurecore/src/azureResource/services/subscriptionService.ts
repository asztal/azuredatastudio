/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { Account, AzureResourceSubscription } from 'sqlops';
import { ServiceClientCredentials } from 'ms-rest';
import { SubscriptionClient } from 'azure-arm-resource';
import * as request from 'request';

import { IAzureResourceSubscriptionService } from '../interfaces';

export class AzureResourceSubscriptionService implements IAzureResourceSubscriptionService {
	public async getSubscriptions(account: Account, credentials: ServiceClientCredentials[]): Promise<AzureResourceSubscription[]> {
		let subscriptions: AzureResourceSubscription[] = [];
		for (let cred of credentials) {
			let subClient = new SubscriptionClient.SubscriptionClient(cred);
			try {
				let subs = await subClient.subscriptions.list();
				subs.forEach(async (sub) => {
					let tenantId = undefined;

					const url = `https://management.azure.com/subscriptions/${sub.subscriptionId}?api-version=2014-04-01`;
					request(url, function (error, response, body) {
						if (response.statusCode === 401) {
							const tenantIdRegEx = /authorization_uri="https:\/\/login\.windows\.net\/([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})"/;
							const teantIdString = response.headers['www-authenticate'];
							if (tenantIdRegEx.test(teantIdString)) {
								tenantId = tenantIdRegEx.exec(teantIdString)[1];
							}
						}

						subscriptions.push({
							id: sub.subscriptionId,
							name: sub.displayName,
							tenantId: tenantId
						});
					});
				});
			} catch (error) {
				// Swallow the exception here.
			}
		}

		return subscriptions;
	}
}
