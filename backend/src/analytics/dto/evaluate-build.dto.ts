import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsPositive,
} from 'class-validator';

export class EvaluateBuildDto {
  @IsInt()
  @IsPositive()
  heroId!: number;

  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(12)
  @ArrayUnique()
  itemIds!: number[];
}
