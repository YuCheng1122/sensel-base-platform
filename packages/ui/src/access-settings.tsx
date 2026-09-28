"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { request, type Group, type User } from "./api-client";
import { Button, Field, Notice, PageHeader } from "./primitives";
export function AccessSettings({ kind }: { kind: "users" | "groups" }) {
  const [items, setItems] = useState<(User | Group)[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [editing, setEditing] = useState<User | Group | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const data = await request<{ items: (User | Group)[] }>(`/${kind}`);
    setItems(data.items);
    if (kind === "users")
      setGroups((await request<{ items: Group[] }>("/groups")).items);
  }, [kind]);
  useEffect(() => {
    setLoading(true);
    setEditing(null);
    setError("");
    setNotice("");
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [kind, refresh]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    setBusy(true);
    setError("");
    setNotice("");
    const body: Record<string, unknown> = { name: data.get("name") };
    if (editing) {
      body.id = editing.id;
      body.expectedVersion = editing.version;
    }
    if (kind === "users") {
      Object.assign(body, {
        email: data.get("email"),
        role: data.get("role"),
        enabled: data.get("enabled") === "on",
        groupIds: data.getAll("groupIds"),
      });
      if (data.get("password")) body.password = data.get("password");
    } else body.description = data.get("description");
    try {
      await request(`/${kind}`, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setEditing(null);
      formElement.reset();
      await refresh();
      setNotice("已儲存並重新讀取資料。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  const user = editing && "email" in editing ? editing : null;
  return (
    <>
      <PageHeader title={kind === "users" ? "使用者管理" : "群組管理"} />
      <div className="stack">
        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        <div className="split">
          <section className="panel table-wrap" aria-busy={loading}>
            {loading ? (
              <p>載入中…</p>
            ) : (
              <table className="settings-table">
                <thead>
                  <tr>
                    <th>名稱</th>
                    <th>{kind === "users" ? "帳號 / 角色" : "說明"}</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>
                        {"email" in item ? (
                          <>
                            {item.email}
                            <br />
                            <small>
                              {item.role} · {item.enabled ? "啟用" : "停用"}
                            </small>
                          </>
                        ) : (
                          item.description
                        )}
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => {
                            setEditing(item);
                            setNotice("");
                          }}
                        >
                          編輯 {item.name}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && !items.length && <p className="muted">尚無資料。</p>}
          </section>
          <form
            key={`${kind}-${editing?.id ?? "new"}-${editing?.version ?? 0}`}
            className="panel stack"
            onSubmit={save}
          >
            <h2>
              {editing ? "編輯" : "新增"}
              {kind === "users" ? "使用者" : "群組"}
            </h2>
            <Field label="名稱">
              <input
                name="name"
                defaultValue={editing?.name}
                required
                maxLength={100}
              />
            </Field>
            {kind === "users" ? (
              <>
                <Field label="電子郵件">
                  <input
                    name="email"
                    type="email"
                    defaultValue={user?.email}
                    required
                  />
                </Field>
                <Field label={editing ? "重設密碼（留空保留）" : "初始密碼"}>
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required={!editing}
                    minLength={12}
                    maxLength={72}
                  />
                </Field>
                <Field label="角色">
                  <select name="role" defaultValue={user?.role ?? "USER"}>
                    <option value="USER">使用者</option>
                    <option value="ADMIN">管理員</option>
                  </select>
                </Field>
                <label className="check">
                  <input
                    name="enabled"
                    type="checkbox"
                    defaultChecked={user?.enabled ?? true}
                  />
                  啟用帳號
                </label>
                <fieldset>
                  <legend>群組</legend>
                  {groups.length ? (
                    groups.map((group) => (
                      <label className="check" key={group.id}>
                        <input
                          name="groupIds"
                          type="checkbox"
                          value={group.id}
                          defaultChecked={user?.groupIds.includes(group.id)}
                        />
                        {group.name}
                      </label>
                    ))
                  ) : (
                    <p className="muted">尚未建立群組。</p>
                  )}
                </fieldset>
              </>
            ) : (
              <Field label="說明">
                <textarea
                  name="description"
                  defaultValue={
                    editing && "description" in editing
                      ? editing.description
                      : ""
                  }
                />
              </Field>
            )}
            <div className="row">
              <Button disabled={busy}>{busy ? "儲存中…" : "儲存"}</Button>
              {editing && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  取消編輯
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
