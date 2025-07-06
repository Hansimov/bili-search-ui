import { SpaceMyInfo, MidCard, RelationFollowingResponse, RelationFollowingUserInfo, RelationFollowingUserInfoList } from './types';
import { CookieManager } from './cookieManager';

export class BiliApiClient {
    // 获取当前用户信息 (space/myinfo)
    static async fetchSpaceMyInfo(): Promise<SpaceMyInfo | null> {
        try {
            console.log('Fetching space myinfo with auth headers');
            const cookies = CookieManager.getBiliCookies();
            console.log('Current cookies state:', {
                hasSessionData: !!cookies?.SESSDATA,
                hasDedeUserID: !!cookies?.DedeUserID,
                sessionDataLength: cookies?.SESSDATA?.length || 0
            });

            const headers = CookieManager.getAuthHeaders();
            const response = await fetch('/bili-api/x/space/myinfo', {
                method: 'GET',
                headers: headers,
                credentials: 'include',
            });

            console.log('SpaceMyInfo response status:', response.status);

            if (!response.ok) {
                console.error('SpaceMyInfo request failed with status:', response.status);
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                return null;
            }

            const data = await response.json();
            console.log('SpaceMyInfo response data:', { code: data.code, message: data.message, hasData: !!data.data });

            if (data.code === 0 && data.data) {
                console.log('SpaceMyInfo processed successfully');
                return data.data as SpaceMyInfo;
            } else {
                console.error('SpaceMyInfo API returned error:', data.code, data.message);
                return null;
            }
        } catch (error) {
            console.error('Error fetching space myinfo:', error);
            return null;
        }
    }

    // 获取用户卡片信息 (web-interface/card)
    static async fetchMidCard(mid: string, useAuth = false): Promise<MidCard | null> {
        try {
            console.log('Fetching mid card for mid:', mid);
            const headers = useAuth ? CookieManager.getAuthHeaders() : { 'Content-Type': 'application/json' };

            const response = await fetch(`/bili-api/x/web-interface/card?mid=${mid}&photo=true`, {
                method: 'GET',
                headers,
                credentials: 'include',
            });

            console.log('MidCard response status:', response.status);

            if (!response.ok) {
                console.error('MidCard request failed with status:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('MidCard response data:', data);

            if (data.code === 0 && data.data) {
                console.log('MidCard processed successfully');
                return data.data as MidCard;
            } else {
                console.error('MidCard API returned error:', data.code, data.message);
                return null;
            }
        } catch (error) {
            console.error('Error fetching mid card:', error);
            return null;
        }
    }
    static async fetchRelationFollowings(
        vmid: string,
        existingData?: RelationFollowingUserInfoList | null
    ): Promise<RelationFollowingUserInfo[] | null> {
        try {
            console.log('Fetching relation followings for vmid:', vmid);
            const headers = CookieManager.getAuthHeaders();

            let allUsers: RelationFollowingUserInfo[] = [];
            let pn = 1;
            const ps = 50;
            const maxPages = 60; // 最大页数限制 (3000/50)

            // 第一页：检查数据有效性
            console.log('Fetching first page to check data validity');
            const firstPageResponse = await this.fetchSinglePage(vmid, pn, ps, headers);

            if (!firstPageResponse) {
                console.error('Failed to fetch first page');
                return null;
            }

            const { users: firstPageUsers, total: currentTotal } = firstPageResponse;

            // 如果有本地数据，进行校验
            if (existingData && existingData.users.length > 0) {
                console.log('Validating existing data against first page');

                // 校验总数是否一致
                const totalMatches = existingData.total === currentTotal;
                console.log(`Total count validation: existing=${existingData.total}, current=${currentTotal}, matches=${totalMatches}`);

                // 校验前ps个用户的mid是否一致
                const existingFirstPageMids = existingData.users.slice(0, ps).map(user => user.mid);
                const currentFirstPageMids = firstPageUsers.map(user => user.mid);
                const midsMatch = this.arrayEquals(existingFirstPageMids, currentFirstPageMids);
                console.log(`First page MIDs validation: matches=${midsMatch}`);
                console.log('Existing first page MIDs:', existingFirstPageMids.slice(0, 5), '...');
                console.log('Current first page MIDs:', currentFirstPageMids.slice(0, 5), '...');

                if (totalMatches && midsMatch) {
                    console.log('Data is up to date, using existing data');
                    return existingData.users;
                }

                console.log('Data has changed, performing incremental update');
                // 如果数据有变化，继续增量更新逻辑
                return await this.performIncrementalUpdate(vmid, existingData, headers, ps, maxPages);
            }

            // 没有本地数据，执行完整抓取
            console.log('No existing data, performing full fetch');
            allUsers = firstPageUsers;
            pn = 2; // 从第二页开始

            // 继续获取剩余页面
            while (pn <= maxPages) {
                console.log(`Fetching page ${pn} of relation followings`);

                const pageResponse = await this.fetchSinglePage(vmid, pn, ps, headers);
                if (!pageResponse || pageResponse.users.length === 0) {
                    console.log('No more users found, stopping pagination');
                    break;
                }

                allUsers = allUsers.concat(pageResponse.users);
                console.log(`Added ${pageResponse.users.length} users, total now: ${allUsers.length}`);

                // 如果获取的用户数少于每页数量，说明已经是最后一页
                if (pageResponse.users.length < ps) {
                    console.log('Last page reached (incomplete page)');
                    break;
                }

                pn++;

                // 延迟1秒再请求下一页
                if (pn <= maxPages) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            console.log(`RelationFollowings fetch completed. Total users: ${allUsers.length}`);
            return allUsers;
        } catch (error) {
            console.error('Error fetching relation followings:', error);
            return null;
        }
    }

    // 执行增量更新
    private static async performIncrementalUpdate(
        vmid: string,
        existingData: RelationFollowingUserInfoList,
        headers: HeadersInit,
        ps: number,
        maxPages: number
    ): Promise<RelationFollowingUserInfo[] | null> {
        try {
            const existingMids = new Set(existingData.users.map(user => user.mid));
            let allUsers: RelationFollowingUserInfo[] = [];
            let pn = 1;
            let foundExistingData = false;

            while (pn <= maxPages && !foundExistingData) {
                console.log(`Incremental update: checking page ${pn}`);

                const pageResponse = await this.fetchSinglePage(vmid, pn, ps, headers);
                if (!pageResponse || pageResponse.users.length === 0) {
                    console.log('No more users found during incremental update');
                    break;
                }

                const currentPageMids = pageResponse.users.map(user => user.mid);

                // 检查当前页的所有用户是否都存在于本地数据中
                const allUsersExistLocally = currentPageMids.every(mid => existingMids.has(mid));

                if (allUsersExistLocally && pn > 1) {
                    console.log(`All users in page ${pn} exist in local data, stopping incremental update`);
                    foundExistingData = true;
                    break;
                }

                // 添加当前页用户
                allUsers = allUsers.concat(pageResponse.users);
                console.log(`Incremental update: added ${pageResponse.users.length} users from page ${pn}, total new: ${allUsers.length}`);

                // 如果获取的用户数少于每页数量，说明已经是最后一页
                if (pageResponse.users.length < ps) {
                    console.log('Last page reached during incremental update');
                    break;
                }

                pn++;

                if (pn <= maxPages) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (foundExistingData) {
                // 合并新数据和现有数据，去除重复
                console.log('Merging new data with existing data');
                const mergedUsers = this.mergeAndDeduplicateUsers(allUsers, existingData.users);
                console.log(`Merged result: ${mergedUsers.length} total users`);
                return mergedUsers;
            } else {
                // 如果没有找到重叠数据，可能是完全新的关注列表，继续完整抓取
                console.log('No overlap found, continuing with full fetch');
                return await this.continueFullFetch(vmid, allUsers, pn, headers, ps, maxPages);
            }
        } catch (error) {
            console.error('Error during incremental update:', error);
            return null;
        }
    }

    // 继续完整抓取
    private static async continueFullFetch(
        vmid: string,
        existingUsers: RelationFollowingUserInfo[],
        startPn: number,
        headers: HeadersInit,
        ps: number,
        maxPages: number
    ): Promise<RelationFollowingUserInfo[] | null> {
        let allUsers = [...existingUsers];
        let pn = startPn;

        while (pn <= maxPages) {
            console.log(`Continuing full fetch: page ${pn}`);

            const pageResponse = await this.fetchSinglePage(vmid, pn, ps, headers);
            if (!pageResponse || pageResponse.users.length === 0) {
                break;
            }

            allUsers = allUsers.concat(pageResponse.users);

            if (pageResponse.users.length < ps) {
                break;
            }

            pn++;

            if (pn <= maxPages) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return allUsers;
    }

    // 获取单页数据
    private static async fetchSinglePage(
        vmid: string,
        pn: number,
        ps: number,
        headers: HeadersInit
    ): Promise<{ users: RelationFollowingUserInfo[]; total: number } | null> {
        try {
            const url = `/bili-api/x/relation/followings?order=desc&vmid=${vmid}&ps=${ps}&pn=${pn}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                credentials: 'include',
            });

            if (!response.ok) {
                console.error(`Request failed with status: ${response.status} for page ${pn}`);
                return null;
            }

            const data: RelationFollowingResponse = await response.json();

            if (data.code !== 0) {
                console.error(`API returned error for page ${pn}:`, data.code, data.message);
                return null;
            }

            return {
                users: data.data?.list || [],
                total: data.data?.total || 0
            };
        } catch (error) {
            console.error(`Error fetching page ${pn}:`, error);
            return null;
        }
    }

    // 合并并去重用户列表
    private static mergeAndDeduplicateUsers(
        newUsers: RelationFollowingUserInfo[],
        existingUsers: RelationFollowingUserInfo[]
    ): RelationFollowingUserInfo[] {
        const existingMids = new Set(existingUsers.map(user => user.mid));
        const uniqueNewUsers = newUsers.filter(user => !existingMids.has(user.mid));

        // 新用户在前，保持时间顺序
        return [...uniqueNewUsers, ...existingUsers];
    }

    // 数组比较工具函数
    private static arrayEquals<T>(a: T[], b: T[]): boolean {
        if (a.length !== b.length) return false;
        return a.every((val, index) => val === b[index]);
    }
}