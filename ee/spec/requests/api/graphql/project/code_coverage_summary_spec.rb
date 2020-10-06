# frozen_string_literal: true

require 'spec_helper'

RSpec.describe 'Getting code coverage summary in a project' do
  include GraphqlHelpers

  let(:project) { create(:project, :repository, :public) }
  let(:current_user) { create(:user) }
  let(:code_coverage_summary_graphql_data) { graphql_data['projects']['nodes'].first['codeCoverageSummary'] }
  let(:fields) do
    <<~QUERY
    nodes {
      id
      name
      codeCoverageSummary {
        averageCoverage
        coverageCount
        lastUpdatedAt
      }
    }
    QUERY
  end

  let(:query) do
    graphql_query_for(
      'projects',
      { 'ids' => [project.to_global_id.to_s] },
      fields
    )
  end

  it_behaves_like 'a working graphql query' do
    before do
      post_graphql(query, current_user: current_user)
    end
  end

  context 'when project has coverage' do
    let!(:daily_build_group_report_result) { create(:ci_daily_build_group_report_result, project: project) }

    it 'contains code coverage summary data', :aggregates_failures do
      post_graphql(query, current_user: current_user)

      expect(code_coverage_summary_graphql_data.dig('averageCoverage')).to eq(77.0)
      expect(code_coverage_summary_graphql_data.dig('coverageCount')).to eq(1)
      expect(code_coverage_summary_graphql_data.dig('lastUpdatedAt')).to eq(daily_build_group_report_result.date.to_s)
    end
  end

  context 'when project does not have coverage' do
    it 'returns nil' do
      post_graphql(query, current_user: current_user)

      expect(code_coverage_summary_graphql_data).to be_nil
    end
  end

  context 'when group_coverage_data_report flag is disabled' do
    it 'returns a graphQL error field does not exist' do
      stub_feature_flags(group_coverage_data_report: false)

      post_graphql(query, current_user: current_user)
      expect_graphql_errors_to_include(/Field 'codeCoverageSummary' doesn't exist on type 'Project'/)
    end
  end
end
