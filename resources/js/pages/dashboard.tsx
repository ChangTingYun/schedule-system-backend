import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
// 移除 ShiftList 和 UserList 的導入，因為它們不再被使用
// import ShiftList from '../components/ShiftList';
// import UserList from '../components/UserList'; 
import ScheduleCalendar from '../components/ScheduleCalendar';
import AuthStatus from '../components/AuthStatus';

type PageProps = {
  auth: {
    user: {
      id: number;
      name: string;
      email: string;
      // 根據你的 user 屬性補充
    };
  };
};

export default function Dashboard({ auth }: PageProps) {
  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Dashboard</h2>}
    >
      <Head title="Dashboard" />
      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          
          {/* 移除 ShiftList 和 UserList 的調用 */}
          {/* <ShiftList /> */}
          {/* <UserList /> */}
          
          {/* 使用 Grid 佈局容納主排班表和下方的權限區塊 */}
          
          <div className="grid grid-cols-1 gap-6">
              
              {/* 第一行： ScheduleCalendar 佔滿整行寬度 (1/1 欄位) */}
              <div className="col-span-1">
                  <ScheduleCalendar />
              </div>
              
              {/* 第二行： 權限管理區塊 (AuthStatus) */}
              {/* 讓它位於排班表下方，佔用 1/3 欄位寬度，並靠左顯示 */}
              <div className="lg:w-1/3 w-full">
                  <AuthStatus />
              </div>
              
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}