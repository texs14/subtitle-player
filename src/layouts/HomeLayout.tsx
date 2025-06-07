import { NavLink, Outlet } from 'react-router-dom';

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-4 py-2 rounded-t transition-colors duration-150 text-sm font-medium ` +
        (isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
      }
    >
      {children}
    </NavLink>
  );
}

export default function HomeLayout() {
  return (
    <div className="flex flex-col items-center w-full mt-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Tab to="upload">Загрузить видео</Tab>
        <Tab to="video">Видео</Tab>
        <Tab to="exercises">Упражнения</Tab>
        <Tab to="exercises/new">Добавить упражнение</Tab>
      </div>
      {/* Nested pages */}
      <Outlet />
    </div>
  );
}
