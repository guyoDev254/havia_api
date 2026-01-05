import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@Injectable()
export class FaqsService {
  constructor(private prisma: PrismaService) {}

  async findAll(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.faq.findMany({
      where,
      orderBy: [
        { question: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const faq = await this.prisma.faq.findUnique({
      where: { id },
    });

    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }

    return faq;
  }

  async create(createFaqDto: CreateFaqDto) {
    return this.prisma.faq.create({
      data: {
        question: createFaqDto.question,
        answer: createFaqDto.answer,
        category: createFaqDto.category,
        isActive: createFaqDto.isActive ?? true,
      },
    });
  }

  async update(id: string, updateFaqDto: UpdateFaqDto) {
    // Check if FAQ exists
    await this.findOne(id);

    return this.prisma.faq.update({
      where: { id },
      data: updateFaqDto,
    });
  }

  async remove(id: string) {
    // Check if FAQ exists
    await this.findOne(id);

    return this.prisma.faq.delete({
      where: { id },
    });
  }
}

