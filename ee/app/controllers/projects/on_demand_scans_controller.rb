# frozen_string_literal: true

module Projects
  class OnDemandScansController < Projects::ApplicationController
    before_action do
      push_frontend_feature_flag(:security_on_demand_scans_site_validation, @project, default_enabled: :yaml)
      push_frontend_feature_flag(:security_dast_site_profiles_additional_fields, @project, default_enabled: :yaml)
      push_frontend_feature_flag(:dast_saved_scans, @project, default_enabled: :yaml)
    end

    before_action :authorize_read_on_demand_scans!, only: :index
    before_action :authorize_create_on_demand_dast_scan!, only: [:new, :edit]

    feature_category :dynamic_application_security_testing

    def index
    end

    def new
      not_found unless Feature.enabled?(:dast_saved_scans, @project, default_enabled: :yaml)
    end

    def edit
      not_found unless Feature.enabled?(:dast_saved_scans, @project, default_enabled: :yaml)

      dast_profile = Dast::ProfilesFinder.new(project_id: @project.id, id: params[:id]).execute.first! # rubocop: disable CodeReuse/ActiveRecord

      @dast_profile = {
        id: dast_profile.to_global_id.to_s,
        name: dast_profile.name,
        description: dast_profile.description,
        site_profile_id: DastSiteProfile.new(id: dast_profile.dast_site_profile_id).to_global_id.to_s,
        scanner_profile_id: DastScannerProfile.new(id: dast_profile.dast_scanner_profile_id).to_global_id.to_s
      }
    end
  end
end
