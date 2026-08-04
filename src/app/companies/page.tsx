import pool, { Company } from '@/lib/db';
import SearchFilter from './SearchFilter';
import Link from 'next/link';
import {
  IconStar,
  IconWorld,
  IconPhone,
  IconMapPin,
  IconBuilding,
  IconChevronLeft,
  IconChevronRight,
  IconMessageCircle,
} from '@tabler/icons-react';

export const revalidate = 0; // Dynamic rendering for search/filters

interface PageProps {
  searchParams: Promise<{
    search?: string;
    city?: string;
    page?: string;
  }>;
}

async function getCompanyData(search: string, city: string, pageNum: number, pageSize: number = 20) {
  const offset = (pageNum - 1) * pageSize;

  const dataQuery = `
    SELECT id, name, category, city, address, rating, reviews_count, site, phone
    FROM companies
    WHERE ($1::text = '' OR name ILIKE '%' || $1 || '%')
      AND ($2::text = '' OR city = $2)
    ORDER BY id ASC
    LIMIT $3 OFFSET $4;
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM companies
    WHERE ($1::text = '' OR name ILIKE '%' || $1 || '%')
      AND ($2::text = '' OR city = $2);
  `;

  const citiesQuery = `
    SELECT DISTINCT city
    FROM companies
    ORDER BY city ASC;
  `;

  const [dataRes, countRes, citiesRes] = await Promise.all([
    pool.query(dataQuery, [search, city, pageSize, offset]),
    pool.query(countQuery, [search, city]),
    pool.query(citiesQuery),
  ]);

  const total = parseInt(countRes.rows[0].total, 10);
  const totalPages = Math.ceil(total / pageSize);
  const cities: string[] = citiesRes.rows.map((r) => r.city);
  const companies: Company[] = dataRes.rows;

  return {
    companies,
    total,
    totalPages,
    cities,
  };
}

export default async function CompaniesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const search = resolvedParams?.search || '';
  const city = resolvedParams?.city || '';
  const currentPage = Math.max(1, parseInt(resolvedParams?.page || '1', 10));
  const pageSize = 20;

  const { companies, total, totalPages, cities } = await getCompanyData(
    search,
    city,
    currentPage,
    pageSize
  );

  const buildPaginationUrl = (page: number) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (city) params.set('city', city);
    params.set('page', page.toString());
    return `/companies?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background radial glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none" />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Header Section */}
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <IconBuilding size={28} />
            </span>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-indigo-400 font-semibold">
                Каталог организаций
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Компании ({total})
              </h1>
            </div>
          </div>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl">
            Поиск и фильтрация организаций в реальном времени из базы PostgreSQL. 
            Поиск осуществляется по наименованию и выбранному городу.
          </p>
        </header>

        {/* Filter Controls */}
        <SearchFilter
          cities={cities}
          initialSearch={search}
          initialCity={city}
          totalCount={total}
        />

        {/* Table Container */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/90 border-b border-zinc-800 text-xs font-mono uppercase text-zinc-400 tracking-wider">
                  <th className="py-3.5 px-4 font-semibold w-24">ID</th>
                  <th className="py-3.5 px-4 font-semibold">Компания</th>
                  <th className="py-3.5 px-4 font-semibold">Категория</th>
                  <th className="py-3.5 px-4 font-semibold">Город и Адрес</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Рейтинг / Отзывы</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Контакты</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-zinc-400 space-y-3">
                      <div className="inline-flex p-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 mb-1">
                        <IconBuilding size={36} />
                      </div>
                      <p className="text-base font-medium text-zinc-200">
                        Компаний по заданным критериям не найдено
                      </p>
                      <p className="text-xs text-zinc-500 max-w-md mx-auto">
                        Попробуйте изменить запрос в поиске или сбросить фильтр по городу.
                      </p>
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr
                      key={company.id}
                      className="hover:bg-zinc-800/40 transition-colors group"
                    >
                      {/* ID */}
                      <td className="py-4 px-4 font-mono text-xs text-zinc-500 group-hover:text-zinc-400">
                        {company.id}
                      </td>

                      {/* Name & Website */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors">
                          {company.name}
                        </div>
                        {company.site ? (
                          <a
                            href={company.site}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-0.5"
                          >
                            <IconWorld size={13} />
                            <span className="truncate max-w-[200px]">
                              {company.site.replace(/^https?:\/\//, '')}
                            </span>
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-600 italic">Сайт не указан</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                          {company.category}
                        </span>
                      </td>

                      {/* City & Address */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                          <IconMapPin size={14} className="text-emerald-400 shrink-0" />
                          <span>{company.city}</span>
                        </div>
                        <div className="text-xs text-zinc-400 truncate max-w-[240px] mt-0.5">
                          {company.address}
                        </div>
                      </td>

                      {/* Rating & Reviews */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          {company.rating !== null ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <IconStar size={12} className="fill-amber-400" />
                              {Number(company.rating).toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">Без оценки</span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                            <IconMessageCircle size={11} />
                            {company.reviews_count} отзывов
                          </span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        {company.phone ? (
                          <a
                            href={`tel:${company.phone.replace(/[^+\d]/g, '')}`}
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white font-mono bg-zinc-800/80 hover:bg-zinc-700/80 px-2.5 py-1.5 rounded-lg border border-zinc-700/50 transition-colors"
                          >
                            <IconPhone size={13} className="text-indigo-400" />
                            <span>{company.phone}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <div>
                Страница <strong className="text-zinc-200">{currentPage}</strong> из{' '}
                <strong className="text-zinc-200">{totalPages}</strong>
              </div>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={buildPaginationUrl(currentPage - 1)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1 px-2.5"
                  >
                    <IconChevronLeft size={16} />
                    <span>Назад</span>
                  </Link>
                ) : (
                  <span className="p-1.5 rounded-lg bg-zinc-900 text-zinc-600 cursor-not-allowed flex items-center gap-1 px-2.5">
                    <IconChevronLeft size={16} />
                    <span>Назад</span>
                  </span>
                )}

                {currentPage < totalPages ? (
                  <Link
                    href={buildPaginationUrl(currentPage + 1)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1 px-2.5"
                  >
                    <span>Вперед</span>
                    <IconChevronRight size={16} />
                  </Link>
                ) : (
                  <span className="p-1.5 rounded-lg bg-zinc-900 text-zinc-600 cursor-not-allowed flex items-center gap-1 px-2.5">
                    <span>Вперед</span>
                    <IconChevronRight size={16} />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
