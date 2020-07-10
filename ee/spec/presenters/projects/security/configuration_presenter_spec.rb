# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Projects::Security::ConfigurationPresenter do
  include Gitlab::Routing.url_helpers

  let(:project) { create(:project, :repository) }
  let(:current_user) { create(:user) }

  it 'presents the given project' do
    presenter = described_class.new(project)

    expect(presenter.id).to be(project.id)
  end

  before do
    project.add_maintainer(current_user)
  end

  describe '#to_h' do
    subject { described_class.new(project, auto_fix_permission: true, current_user: current_user).to_h }

    it 'includes links to auto devops and secure product docs' do
      expect(subject[:auto_devops_help_page_path]).to eq(help_page_path('topics/autodevops/index'))
      expect(subject[:help_page_path]).to eq(help_page_path('user/application_security/index'))
    end

    it 'includes settings for auto_fix feature' do
      auto_fix = Gitlab::Json.parse(subject[:auto_fix_enabled])

      expect(auto_fix['dependency_scanning']).to be_truthy
      expect(auto_fix['container_scanning']).to be_truthy
    end

    it 'includes the path to create a SAST merge request' do
      expect(subject[:create_sast_merge_request_path]).to eq(project_security_configuration_sast_path(project))
    end

    context "when the latest default branch pipeline's source is auto devops" do
      before do
        pipeline = create(
          :ci_pipeline,
          :auto_devops_source,
          project: project,
          ref: project.default_branch,
          sha: project.commit.sha
        )
        create(:ci_build, :sast, pipeline: pipeline, status: 'success')
        create(:ci_build, :dast, pipeline: pipeline, status: 'success')
        create(:ci_build, :secret_detection, pipeline: pipeline, status: 'pending')
      end

      it 'reports that auto devops is enabled' do
        expect(subject[:auto_devops_enabled]).to be_truthy
      end

      it 'reports auto_fix permissions' do
        expect(subject[:can_toggle_auto_fix_settings]).to be_truthy
      end

      it 'reports that all scanners are configured for which latest pipeline has builds' do
        expect(Gitlab::Json.parse(subject[:features])).to contain_exactly(
          security_scan(:dast, configured: true),
          security_scan(:sast, configured: true),
          security_scan(:container_scanning, configured: false),
          security_scan(:dependency_scanning, configured: false),
          security_scan(:license_scanning, configured: false),
          security_scan(:secret_detection, configured: true)
        )
      end
    end

    context 'when the project has no default branch pipeline' do
      it 'reports that auto devops is disabled' do
        expect(subject[:auto_devops_enabled]).to be_falsy
      end

      it 'includes a link to CI pipeline docs' do
        expect(subject[:latest_pipeline_path]).to eq(help_page_path('ci/pipelines'))
      end

      it 'reports all security jobs as unconfigured' do
        expect(Gitlab::Json.parse(subject[:features])).to contain_exactly(
          security_scan(:dast, configured: false),
          security_scan(:sast, configured: false),
          security_scan(:container_scanning, configured: false),
          security_scan(:dependency_scanning, configured: false),
          security_scan(:license_scanning, configured: false),
          security_scan(:secret_detection, configured: false)
        )
      end
    end

    context 'when latest default branch pipeline`s source is not auto devops' do
      let(:pipeline) do
        create(
          :ci_pipeline,
          project: project,
          ref: project.default_branch,
          sha: project.commit.sha
        )
      end

      before do
        create(:ci_build, :sast, pipeline: pipeline)
        create(:ci_build, :dast, pipeline: pipeline)
        create(:ci_build, :secret_detection, pipeline: pipeline)
      end

      it 'uses the latest default branch pipeline to determine whether a security job is configured' do
        expect(Gitlab::Json.parse(subject[:features])).to contain_exactly(
          security_scan(:dast, configured: true),
          security_scan(:sast, configured: true),
          security_scan(:container_scanning, configured: false),
          security_scan(:dependency_scanning, configured: false),
          security_scan(:license_scanning, configured: false),
          security_scan(:secret_detection, configured: true)
        )
      end

      it 'works with both legacy and current job formats' do
        stub_feature_flags(ci_build_metadata_config: false)

        create(:ci_build, :sast, pipeline: pipeline)

        expect(Gitlab::Json.parse(subject[:features])).to contain_exactly(
          security_scan(:dast, configured: false),
          security_scan(:sast, configured: true),
          security_scan(:container_scanning, configured: false),
          security_scan(:dependency_scanning, configured: false),
          security_scan(:license_scanning, configured: false),
          security_scan(:secret_detection, configured: false)
        )
      end

      it 'detects security jobs even when the job has more than one report' do
        config = { artifacts: { reports: { other_job: ['gl-other-report.json'], sast: ['gl-sast-report.json'] } } }
        complicated_metadata = double(:complicated_metadata, config_options: config)
        complicated_job = double(:complicated_job, metadata: complicated_metadata)

        allow_next_instance_of(::Security::SecurityJobsFinder) do |finder|
          allow(finder).to receive(:execute).and_return([complicated_job])
        end

        subject

        expect(Gitlab::Json.parse(subject[:features])).to contain_exactly(
          security_scan(:dast, configured: false),
          security_scan(:sast, configured: true),
          security_scan(:container_scanning, configured: false),
          security_scan(:dependency_scanning, configured: false),
          security_scan(:license_scanning, configured: false),
          security_scan(:secret_detection, configured: false)
        )
      end

      it 'detect new license compliance job' do
        create(:ci_build, :license_scanning, pipeline: pipeline)

        expect(Gitlab::Json.parse(subject[:features])).to contain_exactly(
          security_scan(:dast, configured: true),
          security_scan(:sast, configured: true),
          security_scan(:container_scanning, configured: false),
          security_scan(:dependency_scanning, configured: false),
          security_scan(:license_scanning, configured: true),
          security_scan(:secret_detection, configured: true)
        )
      end

      it 'includes a link to the latest pipeline' do
        expect(subject[:latest_pipeline_path]).to eq(project_pipeline_path(project, pipeline))
      end

      context "while retrieving information about gitlab ci file" do
        it 'expects the gitlab_ci_presence to be true if the file is present' do
          expect(subject[:gitlab_ci_present]).to eq(true)
        end

        it 'expects the gitlab_ci_presence to be false if the file is absent' do
          allow_any_instance_of(described_class).to receive(:latest_pipeline_for_ref).and_return(nil)
          expect(subject[:gitlab_ci_present]).to eq(false)
        end
      end

      it 'includes the auto_devops_path' do
        expect(subject[:auto_devops_path]).to eq(project_settings_ci_cd_path(project, anchor: 'autodevops-settings'))
      end

      context "while retrieving information about user's ability to enable auto_devops" do
        using RSpec::Parameterized::TableSyntax

        where(:is_admin, :archived, :feature_available, :result) do
          true     | true      | true   | false
          false    | true      | true   | false
          true     | false     | true   | true
          false    | false     | true   | false
          true     | true      | false  | false
          false    | true      | false  | false
          true     | false     | false  | false
          false    | false     | false  | false
        end

        with_them do
          before do
            allow_any_instance_of(described_class).to receive(:can?).and_return(is_admin)
            allow_any_instance_of(described_class).to receive(:archived?).and_return(archived)
            allow_any_instance_of(described_class).to receive(:feature_available?).and_return(feature_available)
          end

          it 'includes can_enable_auto_devops' do
            expect(subject[:can_enable_auto_devops]).to eq(result)
          end
        end
      end
    end
  end

  def security_scan(type, configured:)
    {
      "type" => type.to_s,
      "configured" => configured,
      "description" => described_class.localized_scan_descriptions[type],
      "link" => help_page_path(described_class::SCAN_DOCS[type]),
      "name" => described_class.localized_scan_names[type]
    }
  end
end
