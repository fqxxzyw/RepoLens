import { ArrowRight, Search, LoaderCircle } from "lucide-react";
import { useState } from "react";
export function SearchBar({
  onSearch,
  loading,
}: {
  onSearch: (value: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="search-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value);
      }}
    >
      <label htmlFor="repository" className="sr-only">
        GitHub 仓库地址
      </label>
      <Search size={22} className="search-icon" />
      <input
        id="repository"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="粘贴 GitHub 链接，或输入 owner/repo"
        autoComplete="off"
        spellCheck={false}
        required
      />
      <button className="primary-button" type="submit">
        {loading ? (
          <LoaderCircle size={17} className="animate-spin" />
        ) : (
          <ArrowRight size={18} />
        )}
        <span>分析仓库</span>
      </button>
    </form>
  );
}
