"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { request, type Group, type User } from "./api-client";
import { Button, Field, Notice, PageHeader } from "./primitives";
import { SettingsDialog } from "./settings-dialog";
import { Plus, Search } from "lucide-react";
export function AccessSettings({ kind }: { kind: "users" | "groups" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<(User | Group)[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [editing, setEditing] = useState<User | Group | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    setReady(false);
    const [data, groupData] = await Promise.all([
      request<{ items: (User | Group)[] }>(`/${kind}`),
      kind === "users"
        ? request<{ items: Group[] }>("/groups")
        : Promise.resolve({ items: [] as Group[] }),
    ]);
    setItems(data.items);
    setGroups(groupData.items);
    setReady(true);
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
    if (!ready || busy) return;
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
      setOpen(false);
      setEditing(null);
      formElement.reset();
      setNotice("已儲存資料。");
      try {
        await refresh();
        setNotice("已儲存並重新讀取資料。");
      } catch {
        setError(
          "資料已儲存，但列表重新載入失敗；請重新載入後再編輯，勿重複新增。",
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  const filtered = items.filter((item) =>
    `${item.name} ${"email" in item ? item.email : item.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const user = editing && "email" in editing ? editing : null;
  return (
    <div className="sensel-page">
      <PageHeader title={kind === "users" ? "使用者管理" : "群組管理"}>
        <Button
          disabled={busy || loading || !ready}
          onClick={() => {
            setEditing(null);
            setOpen(true);
            setError("");
          }}
        >
          <Plus size={16} aria-hidden="true" />
          新增{kind === "users" ? "使用者" : "群組"}
        </Button>
      </PageHeader>
      <div className="stack">
        {error && !open && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        <div className="access-settings-content">
          <label className="search-control">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="搜尋名稱或帳號"
              placeholder="搜尋名稱或帳號"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
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
                  {filtered.map((item) => (
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
                          disabled={busy || loading || !ready}
                          onClick={() => {
                            setEditing(item);
                            setOpen(true);
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
            {!loading && !filtered.length && (
              <p className="muted">尚無符合條件的資料。</p>
            )}
          </section>
          <SettingsDialog
            open={open}
            onOpenChange={setOpen}
            busy={busy}
            title={`${editing ? "編輯" : "新增"}${kind === "users" ? "使用者" : "群組"}`}
          >
            <form
              key={`${kind}-${editing?.id ?? "new"}-${editing?.version ?? 0}`}
              className="stack"
              onSubmit={save}
            >
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
              {error && <Notice error>{error}</Notice>}
              <div className="row">
                <Button disabled={busy || !ready}>
                  {busy ? "儲存中…" : "儲存"}
                </Button>
                {editing && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      setEditing(null);
                      setOpen(false);
                    }}
                  >
                    取消編輯
                  </Button>
                )}
              </div>
            </form>
          </SettingsDialog>
        </div>
      </div>
    </div>
  );
}
