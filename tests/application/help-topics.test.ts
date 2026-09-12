import { helpTopics } from '../../src/application/help-topics'

it('provides all approved Japanese help topics', () => {
  expect(helpTopics.map((topic) => topic.id)).toEqual(['setup', 'registration', 'copy', 'sort', 'category', 'sync', 'backup'])
  expect(helpTopics.find((topic) => topic.id === 'copy')?.body).toContain('30秒')
})
