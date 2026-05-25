import { getAccessToken } from './wecom-jssdk';

export interface WecomDepartment {
  id: number;
  name: string;
  parentid: number;
  order: number;
}

export interface WecomUser {
  userid: string;
  name: string;
  department: number[];
  mobile?: string;
  email?: string;
  avatar?: string;
  status?: number;
}

export async function getDepartmentList(): Promise<WecomDepartment[]> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/department/list?access_token=${accessToken}`
  );
  const data = await res.json();

  if (data.errcode !== 0) {
    throw new Error(`获取部门列表失败: ${data.errmsg}`);
  }
  return data.department || [];
}

export async function getUserList(departmentId: number): Promise<WecomUser[]> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/user/list?access_token=${accessToken}&department_id=${departmentId}&fetch_child=1`
  );
  const data = await res.json();

  if (data.errcode !== 0) {
    throw new Error(`获取用户列表失败: ${data.errmsg}`);
  }
  return data.userlist || [];
}

export async function getAllUsers(): Promise<WecomUser[]> {
  const departments = await getDepartmentList();
  if (departments.length === 0) return [];

  // Get users from root department (1) with all children
  return getUserList(1);
}

export async function sendMessageToUsers(
  userIds: string[],
  content: string
): Promise<{ errcode: number; errmsg: string; invaliduser?: string }> {
  const accessToken = await getAccessToken();
  const agentId = process.env.WECOM_AGENT_ID;

  const res = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: userIds.join('|'),
        msgtype: 'markdown',
        agentid: Number(agentId),
        markdown: { content },
      }),
    }
  );

  return res.json();
}

// ========== 外部联系人（客户）API ==========

export interface ExternalContactItem {
  external_userid: string;
  name: string;
  avatar?: string;
  type: number; // 1=微信用户, 2=企业微信用户
  unionid?: string;
}

export interface FollowUser {
  userid: string;
  remark?: string;
  description?: string;
  createtime: number;
  tags?: { group_name: string; tag_name: string }[];
  external_userid: string;
}

/** 获取配置了客户联系功能的成员列表 */
export async function getFollowUserList(): Promise<string[]> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get_follow_user_list?access_token=${accessToken}`
  );
  const data = await res.json();

  if (data.errcode !== 0) {
    throw new Error(`获取客户联系成员失败: ${data.errmsg}`);
  }
  return data.follow_user || [];
}

/** 获取指定成员的外部客户列表 */
export async function getExternalContactList(userid: string): Promise<FollowUser[]> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/list?access_token=${accessToken}&userid=${userid}`
  );
  const data = await res.json();

  if (data.errcode !== 0) {
    throw new Error(`获取外部客户列表失败: ${data.errmsg}`);
  }
  return data.external_userid || [];
}

/** 获取外部客户详情 */
export async function getExternalContactDetail(
  externalUserid: string
): Promise<{ external_contact: ExternalContactItem; follow_user: { userid: string; remark?: string }[] } | null> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get?access_token=${accessToken}&external_userid=${externalUserid}`
  );
  const data = await res.json();

  if (data.errcode !== 0) {
    console.warn(`获取外部客户详情失败 [${externalUserid}]: ${data.errmsg}`);
    return null;
  }
  return {
    external_contact: data.external_contact,
    follow_user: data.follow_user,
  };
}

/** 发送消息给外部客户（使用企业群发） */
export async function sendMessageToExternalContacts(
  externalUserIds: string[],
  content: string,
  sender: string
): Promise<{ errcode: number; errmsg: string; msgid?: string }> {
  const accessToken = await getAccessToken();

  const res = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/add_msg_template?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_type: 'single',
        external_userid: externalUserIds,
        sender,
        text: { content },
      }),
    }
  );

  return res.json();
}
