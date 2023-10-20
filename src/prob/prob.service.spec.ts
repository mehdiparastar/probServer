import { Test, TestingModule } from '@nestjs/testing';
import { ProbService } from './prob.service';

describe('ProbService', () => {
  let service: ProbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProbService],
    }).compile();

    service = module.get<ProbService>(ProbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
