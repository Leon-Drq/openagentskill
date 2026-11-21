export interface PublicSkill {
  slug:string; name:string; description:string; long_description:string|null; tagline:string|null;
  author_name:string; author_url:string|null; repository:string; github_repo:string;
  github_stars:number|null; github_forks:number|null; category:string; primary_category:string|null;
  tags:string[]; frameworks:string[]; taxonomy_tags:string[]; output_types:string[];
  version:string|null; license:string|null; license_status:string|null; install_command:string|null;
  npm_package:string|null; ai_review_approved:boolean; listing_status:string; ai_review_issues:string[];
  quality_score:number|null; site_downloads:number|null; github_last_pushed_at:string|null;
  source_ref:string|null; source_path:string|null; source_commit_sha:string|null;
  source_content_hash:string|null; source_sync_status:string|null; created_at:string; updated_at:string;
}
export interface PublicPost { slug:string; title:string; summary:string; content:string; published_at:string; updated_at?:string; truncated?:boolean }
export interface PublicCatalog { version:1; capturedAt:string; source:string; skills:PublicSkill[]; posts:PublicPost[] }
export interface BrowseSkill {
  slug:string; name:string; description:string; author:string; repository:string; category:string;
  tags:string[]; stars:number|null; quality:number|null; downloads:number|null; created:string; updated:string;
  price:string; image:string|null; exampleCount:number; listing:string;
}
