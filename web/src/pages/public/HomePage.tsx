/**
 * HomePage
 *
 * Public landing page matching stitch_kollector_home_page design
 * Features hero section, features grid, and stats
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border-dark bg-background-dark/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">token</span>
            </div>
            <h2 className="text-white text-xl font-black tracking-tight">Kollector</h2>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/app/assets"
                className="flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-gray-900 transition-all hover:bg-[#1de0bf] hover:shadow-[0_0_15px_rgba(37,244,209,0.4)]"
              >
                Vào bộ sưu tập
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:flex h-9 items-center justify-center rounded-lg px-4 text-sm font-bold text-gray-300 transition-colors hover:text-white"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-gray-900 transition-all hover:bg-[#1de0bf] hover:shadow-[0_0_15px_rgba(37,244,209,0.4)]"
                >
                  Tạo tài khoản
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden pt-14 lg:pt-20">
          {/* Background Gradient/Glow */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          >
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-background-dark opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24 sm:pb-32">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-8 flex justify-center">
                <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-400 ring-1 ring-white/10 hover:ring-white/20">
                  Công nghệ AI mới nhất cho Collector.{' '}
                  <Link to="/register" className="font-semibold text-primary">
                    <span aria-hidden="true" className="absolute inset-0" />
                    Tìm hiểu thêm <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>

              <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.1]">
                Quản lý bộ sưu tập của bạn với{' '}
                <span className="text-primary">sức mạnh AI</span>.
              </h1>

              <p className="mt-6 text-lg leading-8 text-gray-400 max-w-2xl mx-auto">
                Theo dõi giá trị, nhận diện thẻ bài tự động và bảo mật tài sản số hóa của bạn trong một nền tảng duy nhất.
              </p>

              <div className="mt-10 flex items-center justify-center gap-x-6">
                {isAuthenticated ? (
                  <Link
                    to="/app/assets"
                    className="rounded-lg bg-primary px-6 py-3 text-base font-bold text-gray-900 shadow-sm hover:bg-[#1de0bf] hover:shadow-[0_0_15px_rgba(37,244,209,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-300"
                  >
                    Xem bộ sưu tập của bạn
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="rounded-lg bg-primary px-6 py-3 text-base font-bold text-gray-900 shadow-sm hover:bg-[#1de0bf] hover:shadow-[0_0_15px_rgba(37,244,209,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-300"
                    >
                      Bắt đầu sưu tầm
                    </Link>
                    <Link
                      to="/login"
                      className="text-base font-bold leading-6 text-white hover:text-primary transition-colors flex items-center gap-2"
                    >
                      Đăng nhập <span aria-hidden="true">→</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Hero Visual */}
            <div className="mt-16 flow-root sm:mt-24">
              <div className="-m-2 rounded-xl bg-white/5 p-2 ring-1 ring-inset ring-white/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                <div className="relative h-[300px] w-full sm:h-[400px] lg:h-[500px] overflow-hidden rounded-md shadow-2xl bg-surface-dark flex items-center justify-center group">
                  {/* Grid overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent" />
                  
                  {/* Abstract Card UI Element */}
                  <div className="relative z-10 flex flex-col items-center gap-4 transition-transform duration-700 group-hover:scale-105">
                    <div className="h-64 w-48 rounded-xl border border-primary/30 bg-black/60 backdrop-blur-md shadow-[0_0_15px_rgba(37,244,209,0.4)] flex flex-col p-3 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_10px_#25f4d1]" />
                      <div className="flex-1 bg-surface-dark/50 rounded-lg mb-3 flex items-center justify-center text-gray-600">
                        <span className="material-symbols-outlined text-4xl text-primary/50">image</span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 w-3/4 bg-white/20 rounded" />
                        <div className="h-2 w-1/2 bg-white/10 rounded" />
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <span className="material-symbols-outlined text-primary text-xl animate-pulse">check_circle</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-dark border border-white/10 text-xs text-primary font-mono uppercase tracking-wider">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                      </span>
                      AI Analysis Complete
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-surface-dark/30 border-y border-white/5 relative">
          {/* Glow spot */}
          <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center mb-16">
              <h2 className="text-base font-semibold leading-7 text-primary">Công nghệ tiên tiến</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Tính năng nổi bật
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-400">
                Kollector cung cấp bộ công cụ toàn diện giúp bạn quản lý tài sản sưu tầm một cách chuyên nghiệp và dễ dàng.
              </p>
            </div>

            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                {/* Feature 1 */}
                <div className="flex flex-col group rounded-2xl bg-surface-dark border border-white/5 p-8 transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 hover:shadow-[0_10px_40px_-10px_rgba(37,244,209,0.1)]">
                  <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-white">
                    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-background-dark border border-primary/20 group-hover:border-primary transition-colors text-primary">
                      <span className="material-symbols-outlined">add_a_photo</span>
                    </div>
                    Upload ảnh nhanh chóng
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-400">
                    <p className="flex-auto">
                      Tải lên hình ảnh bộ sưu tập của bạn ngay lập tức từ điện thoại hoặc máy tính với chất lượng cao nhất.
                    </p>
                  </dd>
                </div>

                {/* Feature 2 */}
                <div className="flex flex-col group rounded-2xl bg-surface-dark border border-white/5 p-8 transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 hover:shadow-[0_10px_40px_-10px_rgba(37,244,209,0.1)]">
                  <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-white">
                    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-background-dark border border-primary/20 group-hover:border-primary transition-colors text-primary">
                      <span className="material-symbols-outlined">smart_toy</span>
                    </div>
                    AI nhận diện thông minh
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-400">
                    <p className="flex-auto">
                      Hệ thống AI tự động phân tích, nhận diện tên, phiên bản và tình trạng thẻ bài chỉ trong vài giây.
                    </p>
                  </dd>
                </div>

                {/* Feature 3 */}
                <div className="flex flex-col group rounded-2xl bg-surface-dark border border-white/5 p-8 transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 hover:shadow-[0_10px_40px_-10px_rgba(37,244,209,0.1)]">
                  <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-white">
                    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-background-dark border border-primary/20 group-hover:border-primary transition-colors text-primary">
                      <span className="material-symbols-outlined">trending_up</span>
                    </div>
                    Theo dõi trạng thái Realtime
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-400">
                    <p className="flex-auto">
                      Cập nhật giá trị thị trường và biến động giá của bộ sưu tập theo thời gian thực mỗi ngày.
                    </p>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-b border-white/5 bg-background-dark">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
              <div className="flex flex-col gap-y-2 border-r border-white/5 last:border-0">
                <span className="text-4xl font-black tracking-tight text-white sm:text-5xl">10k+</span>
                <span className="text-sm font-medium leading-6 text-gray-400 uppercase tracking-widest">Sưu tầm</span>
              </div>
              <div className="flex flex-col gap-y-2 border-r border-white/5 last:border-0 md:border-r">
                <span className="text-4xl font-black tracking-tight text-white sm:text-5xl">50k+</span>
                <span className="text-sm font-medium leading-6 text-gray-400 uppercase tracking-widest">Thẻ bài</span>
              </div>
              <div className="flex flex-col gap-y-2 border-r border-white/5 last:border-0">
                <span className="text-4xl font-black tracking-tight text-white sm:text-5xl">99%</span>
                <span className="text-sm font-medium leading-6 text-gray-400 uppercase tracking-widest">Độ chính xác AI</span>
              </div>
              <div className="flex flex-col gap-y-2">
                <span className="text-4xl font-black tracking-tight text-white sm:text-5xl">2M+</span>
                <span className="text-sm font-medium leading-6 text-gray-400 uppercase tracking-widest">Giao dịch</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Sẵn sàng bắt đầu?
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-400 max-w-2xl mx-auto">
              Tạo tài khoản miễn phí và bắt đầu quản lý bộ sưu tập của bạn ngay hôm nay.
            </p>
            <div className="mt-10">
              {isAuthenticated ? (
                <Link
                  to="/app/assets"
                  className="rounded-lg bg-primary px-8 py-4 text-lg font-bold text-[#0a1412] shadow-sm hover:bg-[#1de0bf] hover:shadow-[0_0_25px_rgba(37,244,209,0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-300"
                >
                  Xem bộ sưu tập
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="rounded-lg bg-primary px-8 py-4 text-lg font-bold text-[#0a1412] shadow-sm hover:bg-[#1de0bf] hover:shadow-[0_0_25px_rgba(37,244,209,0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-300"
                >
                  Tạo tài khoản miễn phí
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-background-dark py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">token</span>
              </div>
              <span className="text-white font-bold">Kollector</span>
            </div>
            <p className="text-sm text-gray-400">
              © 2026 Kollector. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
