export type Language = 'ru' | 'en' | 'th';

const LANG_OPTIONS = [
  { label: 'Русский', value: 'ru' },
  { label: 'Английский', value: 'en' },
  { label: 'Тайский', value: 'th' },
];
const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

interface Props {
  originalLang: string;
  targetLangs: Language[];
  difficulty: string;
  tags: string;
  onChange: (
    fields: Partial<{
      originalLang: string;
      targetLangs: Language[];
      difficulty: string;
      tags: string;
    }>,
  ) => void;
}

export function LanguageMetaForm({ originalLang, targetLangs, difficulty, tags, onChange }: Props) {
  return (
    <div className="w-full max-w-md space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Язык оригинала</label>
        <select
          value={originalLang}
          title="Язык оригинала"
          defaultValue={originalLang}
          onChange={e => onChange({ originalLang: e.target.value })}
          className="block w-full mt-1 border-gray-300 rounded"
        >
          <option value="auto">Определить автоматически</option>
          {LANG_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Языки перевода</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {LANG_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center space-x-1">
              <input
                type="checkbox"
                value={opt.value}
                checked={targetLangs.includes(opt.value as Language)}
                onChange={e => {
                  const v = opt.value as Language;
                  const arr = targetLangs.includes(v)
                    ? targetLangs.filter(x => x !== v)
                    : [...targetLangs, v];
                  onChange({ targetLangs: arr });
                }}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Уровень сложности</label>
        <select
          value={difficulty}
          title="Уровень сложности"
          defaultValue={difficulty}
          onChange={e => onChange({ difficulty: e.target.value })}
          className="block w-full mt-1 border-gray-300 rounded"
        >
          {DIFFICULTY_LEVELS.map(level => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Теги (через запятую)</label>
        <input
          type="text"
          value={tags}
          onChange={e => onChange({ tags: e.target.value })}
          className="block w-full mt-1 border-gray-300 rounded"
          placeholder="news, travel, education"
        />
      </div>
    </div>
  );
}
