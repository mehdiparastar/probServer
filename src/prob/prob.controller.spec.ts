import { Test, TestingModule } from '@nestjs/testing';
import { ProbController } from './prob.controller';
import { ProbService } from './prob.service';

describe('ProbController', () => {
  let controller: ProbController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProbController],
      providers: [ProbService],
    }).compile();

    controller = module.get<ProbController>(ProbController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
